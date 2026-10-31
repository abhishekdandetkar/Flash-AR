# Production Migration & Deployment Runbook — Flash AR

**Status: NOT YET EXECUTED.** This is a checklist of the exact steps to migrate
Flash AR from the Lovable-hosted backend to a **user-owned Supabase project**
and deploy frontend + backend to **Cloudflare Workers**. Every command is
intended to be run and verified during Phase 5; check the boxes as you go.

Prerequisites that block Phase 5:

- [ ] Supabase account + new project created (you own it)
- [ ] Cloudflare account
- [ ] Production domain (optional for `workers.dev`, required for sitemap/canonical/OG URLs)
- [ ] Git installed + repo published

---

## 1. Provision the new Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Collect from **Project settings → API**:
   - Project URL (`https://<ref>.supabase.co`)
   - Publishable (anon) key
   - Service role key (secret — server/CLI only, never client)
3. Collect from **Project settings → Database**: the pooled connection string
   (Transaction mode) for `DATABASE_URL` (drizzle-kit).
4. Fill `.env` (copy `.env.example` first):
   - `VITE_SUPABASE_URL`, `SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL`
   - `VITE_SITE_URL` = final origin (e.g. `https://flash-ar.example.com`)

Notes:

- New Supabase projects issue `sb_publishable_*` / `sb_secret_*` keys by default.
  Decide which key style the app uses and keep it consistent; the code accepts
  both (see `isNewSupabaseApiKey` in `src/integrations/supabase/client.ts`),
  but **mixed key styles across env values will fail RLS checks silently**.
- Keep the old Lovable project untouched until after step 9 (rollback window).

## 2. Export schema + data from the old database

The old database (Lovable Cloud) holds `public.campaigns` and the auth users.

```sh
# Schema + data (tables, functions, RLS policies are inside the schema)
pg_dump -h aws-0-<old-region>.pooler.supabase.com -p 5432 -U postgres -d postgres \
  --schema public --no-owner --no-privileges -F c -f old-db.dump
```

Also export:

- [ ] Auth users (Dashboard → Authentication → Users → export; passwords are
      bcrypt hashes and migrate with them)
- [ ] Auth provider config (redirect URLs, Google client ID — the secret stays in Google Cloud Console)

## 3. Import into the new project

```sh
pg_restore -h aws-0-<new-region>.pooler.supabase.com -p 6543 -U postgres -d postgres \
  --schema public --no-owner --no-privileges --clean --if-exists old-db.dump
```

Alternatively use the repo's drizzle schema as the source of truth and import
**only data**: `drizzle-kit push` with the new `DATABASE_URL`, then copy table
rows (e.g. `\copy` per table). This is cleaner if the old schema has drifted
from `drizzle/schema.ts`.

- [ ] Verify row counts match the source for every table
- [ ] Confirm RLS is enabled on all tables and the policies came across
      (`select * from pg_policies;`) — RLS defines public read / owner-write
      for `campaigns`

## 4. Recreate the Storage bucket and copy objects

Storage contents are not in `pg_dump`. The private `ar-assets` bucket must be
recreated and its objects copied:

1. New project → Storage → New bucket → name `ar-assets`, **private**.
2. Copy objects old → new. Options (verify whichever is chosen):
   - A one-off Node script using `@supabase/supabase-js` with both service keys
     (list → download → upload, preserving object paths and content types).
     Object paths are `<owner-uuid>/<campaign-id>/<file>` — they must not change,
     or DB columns referencing them (`campaigns.cover_url`, layer `src`,
     `mind_url`) must be rewritten.
   - Or rewrite all DB columns to new signed-URL-free public asset paths served
     by `/api/public/assets/*` from the new project.
3. All of the app's media is served through `/api/public/assets/*` (never raw
   storage URLs), so no URL rewrites are needed **if object paths are
   preserved**. Verify a campaign scan works end-to-end before switching users
   over.

## 5. Configure Auth in the new project

- [ ] Import users (Dashboard → Authentication → Users → import/export)
- [ ] Authentication → URL configuration → Site URL + Redirect URLs (include
      the production origin and `http://localhost:3000/auth` for dev)
- [ ] Google OAuth: enable the provider. If the Google OAuth client is currently
      wired to the old project's callback, add the new callback:
      `https://<new-ref>.supabase.co/auth/v1/callback`
      (Google allows one authorized redirect URI per project by default —
      reuse the same OAuth client only if you add the new origin; otherwise
      create a new OAuth client)
- [ ] SMTP for confirmation/reset emails if the old project used custom SMTP —
      otherwise Supabase's default sender applies (rate-limited, unusable-ish
      for real traffic; plan to add SMTP before launch)

## 6. Verify against the new backend locally

```sh
npm run dev   # .env now points at the new Supabase project
```

- [ ] Sign up / sign in (email + Google)
- [ ] Dashboard lists old campaigns → open one → studio loads layers
- [ ] Simulator plays the layers
- [ ] Compile a new `.mind` → save → mobile `/scan/<id>` tracks via `/api/public/assets/*`
- [ ] Check browser console + server logs for auth/storage errors

## 7. Deploy to Cloudflare

The build targets the nitro `cloudflare-module` preset and emits
`.output/server/wrangler.json`. The worker name is pinned to `flash-ar` via the
root `wrangler.jsonc` (nitro merges it with its generated config; all other
fields — main, assets, compatibility date — are generated by nitro).

```sh
npm run build
npx wrangler deploy   # deploy .output/server per generated wrangler.json
```

- [ ] `npm run build` runs locally, `.output/server/wrangler.json` generated
- [ ] `wrangler` installed (`npm i -D wrangler`) and `wrangler login` done
- [ ] Set **runtime vars/secrets** for the worker: `SUPABASE_URL`,
      `SUPABASE_PUBLISHABLE_KEY` (plain) and never-ship-to-client ones as secrets
- [ ] `VITE_*` values must be set **at build time** (set them in the deploy CI
      or shell env when building)
- [ ] Deploy → smoke test on `https://<worker>.workers.dev`:
      `/`, `/robots.txt` (absolute sitemap URL from `VITE_SITE_URL`),
      `/sitemap.xml`, one full studio → scan cycle
- [ ] Known Windows dev quirk: `npx vite preview` fails to spawn wrangler
      (`spawn npx ENOENT`); verify with `npm run dev` instead. On Linux/CI the
      preview works.

## 8. Custom domain + final cutover

- [ ] Add the domain to Cloudflare (Workers → Add custom domain)
- [ ] Set `VITE_SITE_URL` to the production origin and **rebuild + redeploy**
      (it drives sitemap URLs, `Sitemap:` in robots.txt, canonical links, OG URLs —
      all of which bake in at build time)
- [ ] Re-verify robots.txt/sitemap URLs now show the production domain
- [ ] Optional (Phase 6): generate a 1200×630 PNG OG image; SVG og:image is
      ignored by many crawlers

## 9. Decommission Lovable (final decoupling)

Only after the new stack has been verified end-to-end:

- [ ] Final `grep -ri lovable` over source, docs, and `.output/` — expect zero
      (the `lovable.cloud` env URL disappears with the new `VITE_SUPABASE_URL`)
- [ ] Point the old project's... nothing. No DNS/rewrite dependency remains;
      delete the Lovable Cloud project after a final freeze period (a few days)
      seems safe, keeping `old-db.dump` + a storage export as cold backups
- [ ] Publish the git repo with a clean initial commit

---

## CI

`.github/workflows/ci.yml` (added) runs on push/PR:

1. `npm ci`
2. `npm run lint` (fails on errors; warnings tolerated)
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. Guard: greps the built client bundle for `lovable` and fails the job if any
   reference reappears (e.g. a future dependency reintroduction)

A deploy job (wrangler) is intentionally **not** included yet — add it after
step 7 with `CLOUDFLARE_API_TOKEN` as a repository secret, gated on
`refs/heads/main`.

## Quality-gate baseline at the time of writing

Verified 2026-10-31 on this working copy:

- `npm run lint` — 0 errors (6 accepted `react-refresh/only-export-components`
  warnings from shadcn `src/components/ui/*`)
- `npm run typecheck` — clean
- `npm test` — 31/31 passing (5 files)
- `npm run build` — green; nitro emits `.output/server/wrangler.json` for the
  `cloudflare-module` preset and `.output/public/_headers`
- Live smoke (dev server, port 3000): `/robots.txt` 200 with absolute sitemap
  URL, `/sitemap.xml` 200 (XML + lastmod), `/` 200 (SSR "Flash AR" title,
  no favicon refs), `/contact` 200

## Outstanding known items

- Git is not installed on the dev machine → repo not initialized (user action).
- `vite preview` is broken on Windows for the cloudflare preset (nitro spawns
  bare `npx wrangler`; requires the cmd shim or a non-Windows env).
- Og image is SVG (Phase 6 item).
- Security headers/CSP, rate limits, and monitoring are Phase 6 items.
