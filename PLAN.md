# Albumar Studio — Production Plan

> **Revision (2026-10-31):** Per product decision, the brand was unified to **Flash AR**
> (the original "Albumar Studio/Albumar" rename was reverted). Everything named
> below as "Albumar Studio/Albumar" now reads "Flash AR" in the codebase;
> `package.json` is named `flash-ar`. Historical wording in this document is kept as-is.

Goal: take the current Lovable-generated codebase to an independently deployable, production-grade app — **fully decoupled from Lovable**, with **frontend + backend running on Cloudflare**, Lovable branding/AI artifacts removed, favicons removed, and sitemap/SEO correct.

Target deployment: **Cloudflare**

- Frontend + SSR + API routes: Cloudflare **Workers** (the build already targets `nitro({ preset: "cloudflare-module" })` in `vite.config.ts`, so the stack is compatible).
- Database / auth / storage: new **Supabase project owned by you** (replaces Lovable Cloud). Workers talk to it directly; nothing Lovable-hosted remains.

---

## 0. Current-state audit (verified findings)

| #   | Finding                                                                                                                                                                                                                                                                       | File(s)                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Backend lives on Lovable Cloud (`*.lovable.cloud`), not owned independently                                                                                                                                                                                                   | `.env`                                                                    |
| 2   | Names/branding inconsistent: site brand **“Flash AR”**, repo **albumar-studio**, README says **“Albumar Studio”**; `package.json` name is Lovable's template name `tanstack_start_ts`                                                                                         | `src/lib/site.ts`, `package.json`, `README.md`, `public/site.webmanifest` |
| 3   | Favicon set exists (`favicon.ico`, `favicon.svg`, `apple-touch-icon.svg`, `social-preview.svg`) and is wired into root head + manifest                                                                                                                                        | `public/`, `src/routes/__root.tsx`                                        |
| 4   | Sitemap exists but: (a) falls back to `https://example.invalid` when `VITE_SITE_URL` is unset, (b) `robots.txt` advertises a **relative** sitemap URL (spec requires absolute), (c) no `lastmod`                                                                              | `src/routes/sitemap[.]xml.ts`, `public/robots.txt`                        |
| 5   | Dual lockfiles (`bun.lock` + `package-lock.json`) and Lovable-only packages (`@lovable.dev/cloud-auth-js`, `@lovable.dev/vite-tanstack-config`, Lovable's private npm cache URLs) baked into `bun.lock`; Lovable OAuth (`oauth.lovable.app`) present in the built auth bundle | `bun.lock`, `.output/public/assets/*`                                     |
| 6   | Lovable artifacts: `.lovable/`, Lovable travel-sales pitch + `.lovable.app` live link in README, "Sign in with Lovable" section, `AGENTS.md` Lovable block, `bunfig.toml` with Lovable registry guard config                                                                  | repo root                                                                 |
| 7   | Supabase client is marked _"automatically generated. Do not edit"_ (Lovable scaffold); error pages/console copy references “Flash AR”                                                                                                                                         | `src/integrations/supabase/client.ts`, `src/routes/__root.tsx`            |
| 8   | Not a git repository (working copy), no CI                                                                                                                                                                                                                                    | repo root                                                                 |

Everything below is sequenced so the app stays working after each phase.

---

## Phase 1 — Baseline & bug fixes (make it correct before restructuring)

**STATUS: ✅ COMPLETE (verified 2026-10-31)** — npm toolchain standardized (bun.lock/bunfig removed), lint 0 errors, `tsc --noEmit` clean, 31/31 tests pass, production build green (worker name now `albumar-studio`). Brand unified to **Albumar Studio / Albumar** everywhere except README/AGENTS.md (Phase 2). Sitemap + canonical `robots.txt` are now dynamic server routes (`/sitemap.xml`, `/robots.txt`) with absolute Sitemap URL, `lastmod`, and 7 new unit tests.

Changes made

- `src/lib/sitemap.ts` (new): public-path list, XSL escaping, `buildSitemapXml`, `buildRobotsTxt`, origin resolution (falls back to the serving request origin instead of `example.invalid`).
- `src/routes/sitemap[.]xml.ts` rewritten thin; `src/routes/robots[.]txt.ts` new; `public/robots.txt` removed (was static with a spec-violating relative Sitemap URL).
- `src/test/sitemap.test.ts` (new): 7 tests.
- Generated code hardened: removed `@ts-nocheck` in `src/lib/mindar.ts` with a real minimal type surface for the CDN runtime; typed the A-Frame scene surface in `src/routes/scan.$id.tsx` (no `any`); typed legacy JSON shapes in `src/lib/store.ts`; strict-mode fixes in `src/lib/audio.ts`, `site.ts`, `studio.$id.tsx`, `sanitize.ts`.
- Brand renamed Flash AR → **Albumar Studio** (short wordmark **Albumar**) across 17 files incl. `package.json` (was `tanstack_start_ts`), `site.webmanifest`, `social-preview.svg` aria-label.
- `"typecheck": "tsc --noEmit"` script added (type checking was previously never run).

Goals

- Establish a green baseline: `lint`, `test`, `build`, and a smoke run of `dev`.
- Fix identity + SEO inconsistencies.

Tasks

1. `npm install` (resolve the `bun.lock` vs `package-lock.json` conflict — see Phase 2 choice of npm) and record results of `npm run lint && npm run test && npm run build`.
2. Decide the canonical brand name (proposal: **Albumar Studio** everywhere; short name **Albumar**). Update: `package.json` name, `src/lib/site.ts` (`siteName`, meta title/description), `__root.tsx` headers/logos, `site.webmanifest`, RLS-facing copy in `client.ts`.
3. Fix `src/routes/sitemap[.]xml.ts`:
   - Fail loudly (or build-time default) instead of emitting `example.invalid`.
   - Add `lastmod` and ensure only genuinely public, indexable routes are listed.
4. Fix `public/robots.txt`: absolute `Sitemap:` URL, re-check the `Disallow` list still matches real routes.
5. Clean up Lovable leftover copy in error pages / console messages.
6. Regression: run tests; add a small unit test for sitemap generation (origin, escaping, status/headers).

Acceptance

- One consistent brand across the app; no “Flash AR”/“Albumar” mix.
- Lint, tests, and production build pass locally.

## Phase 2 — Remove Lovable from the codebase (code-level decoupling)

**STATUS: ✅ COMPLETE (verified 2026-10-31)** — Except one user action item: **Git is not installed on this machine**, so the repository could not be initialized locally.

Completed

- `bun.lock` + `bunfig.toml` deleted; npm + `package-lock.json` standardized (verified free of Lovable packages/registry URLs).
- `.lovable/` deleted; `README.md` fully rewritten (real setup, env vars, scripts, architecture, Cloudflare target); `AGENTS.md` rewritten with decoupled architecture + conventions.
- `src/integrations/supabase/client.ts` is now hand-maintained ("automatically generated" notice removed).
- Auth verified: `auth.tsx` uses only standard `supabase.auth.*` flows (email/password + Google OAuth); no Lovable OAuth bridge anywhere.
- `.env` added to `.gitignore`; `.env.example` created.
- Fresh production build verified: zero `lovable.dev`/`lovable.app`/OAuth-bridge references in client bundles. The only remaining `lovable.cloud` strings are the baked-in `VITE_SUPABASE_URL` env value, which is intentionally kept working until the Supabase migration in Phase 5.
- `grep -ri lovable` over source, configs and docs: clean (only PLAN.md mentions it as the historical plan).

Open item

- Initialize git (`git init` + initial commit) on a machine with Git installed — Lovable history-sync requirements no longer apply since the project is decoupled.

Goals

- Zero Lovable references in source, lockfile, docs, and build output.

Tasks

1. Lockfile/registry: standardize on **npm + `package-lock.json`** (or, if you prefer bun, keep `bun.lock` but rewrite it without Lovable cache URLs). Delete the other, and delete `bunfig.toml`/replace with an npm equivalent config only if you keep bun.
2. Purge `@lovable.dev/*` packages/URLs from the lockfile.
3. Delete `.lovable/`; rewrite `README.md` (project description, real setup/deploy instructions, no Lovable editor/`.lovable.app` links); remove the Lovable block from `AGENTS.md` and replace with this project's actual conventions.
4. Auth: remove any dependence on Lovable's OAuth bridge. Keep standard Supabase auth (email/password + Google). Verify `auth.tsx` only uses `supabase.auth.*` flows.
5. Rewrite `src/integrations/supabase/client.ts` header/comments (it's plain Supabase JS — safest is to hand-maintain it from now on).
6. Rename repo/package references; initialize **git** (copy is not a repo) with a clean initial commit.
7. Verify: `grep -ri lovable` over `src/`, config files, README, and the **fresh build output in `.output/`** returns nothing.

Acceptance

- `grep -ri lovable` is clean in source and build artifacts.
- Sign-in (email/password), sign-out, and protected-route redirect work in `dev` against the current backend.

## Phase 3 — Remove favicons & AI-generated content

**STATUS: ✅ COMPLETE (verified 2026-10-31)**

- Favicons fully removed: deleted `public/favicon.ico`, `favicon.svg`, `apple-touch-icon.svg`, and `site.webmanifest` (an icon-less manifest would be invalid PWA metadata); the root head's `icon`/`apple-touch-icon`/`manifest` links were removed with it. `public/` now contains only `social-preview.svg`, which is actively used as the OG `og:image` and is branded for Albumar.
- AI/placeholder-copy audit: clean — no lorem/boilerplate/placeholder prose anywhere in route copy; the only "placeholder" hits are real form-input placeholder attributes. Legal pages have original, product-specific text.
- Note (accepted limitation): the demo campaign in `src/lib/demos.ts` streams its video from MDN's CC0 `flower.mp4` URL. Licensed OK (CC0), but it is fetched from the network, so the "demos work fully offline" claim is only true for imagery/data; swapping in a bundled thematic clip is a cosmetic follow-up.

Goals

- No favicon files or references (per your decision); no leftover AI/placeholder content presented as real product content.

Tasks

1. Favicons: delete `public/favicon.ico`, `favicon.svg`, `apple-touch-icon.svg` and remove the `links` entries (`icon`, `apple-touch-icon`) from `__root.tsx`.
2. Decide on `site.webmanifest`: without icons it's an invalid PWA manifest — remove the `icons` entry **and** the `manifest` link, or drop the manifest entirely (recommended, since favicons are fully removed). Keep `social-preview.svg` **only** if it's used for OG images and fits the new brand (otherwise replace/remove the `og:image` too).
3. AI content audit: walk routes (`index`, `contact`, policies, auth) and remove/rewrite AI-placeholder copy, lorem text, and any fake testimonials/stats. Verify demo album assets in `src/lib/demos.ts` are original/appropriately licensed (per the project's asset policy); remove unlicensed media if any.
4. Check `public/` for other stub files (licenses, placeholders) shipped to production.

Acceptance

- `public/` contains no favicon files; root head has no icon/manifest links; no `/favicon.ico` reference anywhere.
- Grep for common AI boilerplate (“lorem”, “It seems…”, placeholder sections) comes back clean.

## Phase 4 — Sitemap & SEO correctness

**STATUS: ✅ COMPLETE (verified 2026-10-31)** — robots.txt and sitemap are dynamic, absolute, spec-compliant server routes (`/robots.txt`, `/sitemap.xml`) driven by `src/lib/sitemap.ts` with unit tests; per-route `rel="canonical"` links added to the five public indexable routes via `canonicalLinks()` in `src/lib/site.ts` (active once `VITE_SITE_URL` is set in production; suppressed in dev to avoid junk canonicals). Per-route titles/descriptions/OG tags already existed and are consistent. Remaining defer-hard item: `og:image` points to an SVG (`social-preview.svg`), which many crawlers ignore — generate a 1200×630 PNG and point og:image at it when branding assets are finalized (Phase 6).

Goals

- Search engines get a correct, absolute, current sitemap and canonical metadata.

Tasks

1. `robots.txt`: absolute `https://<your-domain>/sitemap.xml`, correct rules for `/dashboard`, `/studio/`, `/auth/*`, etc.
2. Sitemap route: driven entirely by `VITE_SITE_URL`; include public pages with `lastmod` (build date or per-route if available); correct `content-type` and cache headers (already mostly there).
3. Root metadata: canonical URL, OG/Twitter tags from one source (`src/lib/site.ts`), `theme-color`, and a sensible per-route title strategy.
4. Optionally: separate `og:image` (PNG, 1200×630) generated from your brand — SVG OG images are ignored by many crawlers.

Acceptance

- `curl https://<domain>/sitemap.xml` and `/robots.txt` look right; every listed URL returns 200; pair-wise Lighthouse/SEO audit has no favicon/meta errors beyond the intentional no-favicon choice.

## Phase 5 — Full decoupling: own Supabase + Cloudflare deployment

**STATUS: 🟡 PREPARATION COMPLETE — EXECUTION BLOCKED ON USER ACCOUNTS (2026-10-31)**
The migration/deploy runbook is written and CI is wired; actual execution needs the
user's Supabase project + Cloudflare account (and Git installed for the repo step):

- `docs/production-runbook.md` (new): step-by-step Supabase provisioning, pg_dump
  import, `ar-assets` bucket copy, auth redirect/OAuth config, local verification,
  Cloudflare build+deploy, custom domain, `VITE_SITE_URL` cutover, and Lovable
  decommission checklist. Honest status: **not yet executed**.
- `.github/workflows/ci.yml` (new): npm ci → lint → typecheck → test → build on
  push/PR + a guard that greps the built client bundle and fails CI if any
  `lovable` reference reappears. A wrangler deploy job is deferred until after
  the first successful manual deploy.
- `wrangler.jsonc` (new, root): pins the deployed worker name to `flash-ar`
  (Nitro merges it into `.output/server/wrangler.json`; without it the name
  auto-generates as `flash-ar-downloads-albumar-studio`). Verified in a fresh
  build.
- Final code polish verified: fixed the last real code warning
  (`react-hooks/exhaustive-deps` in `src/components/LayerView.tsx`) by reading the
  chroma config into the effect body with dep `[layer.chroma]` — gates re-verified
  green (lint 0 errors / 6 shadcn fast-refresh warnings, typecheck clean,
  31/31 tests, build green).
- Live smoke test (dev server): `/robots.txt` 200 (absolute Sitemap URL from
  serving origin), `/sitemap.xml` 200 (valid XML + `lastmod`), `/` 200 (SSR
  "Flash AR" title, no favicon refs), rebranded build output clean.

Blocks: Git not installed on this machine (repo not initialized); new Supabase
project URL; Cloudflare account; `VITE_SITE_URL` production value.

Stage 1 code fixes completed and gates-verified (2026-10-31):
- Rebranded remaining "Groove AR" / `groovear.app` → Flash AR / `flashar.app` in contact + refund-policy (P1-2)
- Added `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` + README env contract (P0-1)
- Campaign IDs now `crypto.randomUUID()` instead of `Math.random()` (P2-6)
- Studio debounced save no longer reports "saved" when the cloud upsert fell back to local-only (P2-7)
- Gates: lint 0 errors, typecheck clean, 31/31 tests pass, build green

Goals

- No Lovable Cloud dependency. App + API on Cloudflare Workers; data/auth/storage on a Supabase project you control.

Tasks — Supabase migration

1. Provision a new Supabase project; enable email/password and Google OAuth (configure Google client ID/secret + redirect URL for your domain).
2. Migrate schema: `drizzle/schema.ts` + `drizzle/migrations` via `drizzle-kit push/migrate` against the new DB (`DATABASE_URL`).
3. Copy **RLS policies** (public-read campaigns, owner-only writes) and triggers/functions from the old project (pg_dump of schema + policies is safest).
4. Migrate `ar-assets` storage bucket contents (cover images, layer media, compiled `.mind` files).
5. Export/import users if you need to keep existing accounts (Supabase Auth admin export), or accept fresh sign-ups.
6. Update env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_*` twins, `VITE_SITE_URL`, `DATABASE_URL` — local `.env` + Cloudflare secrets/vars. Remove `SUPABASE_PROJECT_ID` Lovable-specific bits if unused.

Tasks — Cloudflare

1. Add `wrangler.jsonc` (Workers + static assets, `cloudflare-module` preset compat), set Node compat/aliases as the build output requires.
2. Bind secrets via `wrangler secret put …` (Supabase service usage if any, keys above).
3. Review `src/routes/api/public/assets/*.tsx`: same-origin resource checks, Cache-Control, auth-wrapping cross-device serving after migration.
4. Custom domain, HTTPS, and health check (`/` + `/sitemap.xml` + one `/scan/$id` flow end-to-end with a real `.mind` file).
5. Optional CI (GitHub Actions): lint → test → build → `wrangler deploy` on main.

Acceptance

- A deployed `workers.dev`/custom-domain URL where: sign-up/sign-in works, a campaign can be created with real files uploaded, `/scan/$id` works from another device, and no request ever touches `lovable.cloud`.
- DNS/curl check confirms zero `lovable` domains in network traffic.

## Phase 6 — Production-grade hardening & quality gates

Tasks

1. Error handling: self-hosted error reporting (e.g., Sentry or a CF Worker sink) instead of any Lovable pipeline (`src/lib/error-reporting.ts`).
2. Security headers (CSP with the MindAR/A-Frame CDN origins allow-listed, HSTS, X-Frame-Options), rate limits on public asset/API routes.
3. Performance: audit bundle (MindAR stays CDN-loaded by design), lazy routes, Lighthouse ≥ 90 perf on `/` and `/scan/$id` on a mid-range mobile profile.
4. Accessibility pass on studio + scan flows (contrast, keyboard, focus).
5. Monitoring: CF analytics/logpush + uptime check on `/` and `/auth`.
6. Docs: README rewritten to match reality (setup, env vars, deploy), this PLAN updated to "done" with remaining knowns.

Acceptance (Definition of Done)

- `npm run lint`, `npm run test`, `npm run build` all green in CI.
- Production URL passes the Phase 5 acceptance checklist with zero `lovable` references.
- `grep -ri lovable` clean across repo.
- One full user journey verified end-to-end in the deployed production app: sign in → create campaign → publish QR → scan on a phone.

---

## Risks / open decisions

- **Supabase data migration** is the riskiest step — snapshot the old project first; plan a maintenance window. Existing user sessions/some data may need re-auth.
- MindAR/A-Frame CDN dependency is acceptable but consider vendoring versions for production stability.
- If you want to keep PWA installability, "no favicons at all" conflicts — decision above removes the manifest; revisit if you later want install support.
- Google OAuth callback URLs and the `site.webmanifest`/OG domain must be updated again if the production domain differs from the Cloudflare preview domain.

## Suggested execution order

Phase 1 → 2 → 3 → 4 can all be done locally in one or two sessions. Phase 5 needs your Supabase + Cloudflare accounts and a short coordination window; Phase 6 is iterative polish. Each phase ends with lint + tests + build green before moving on.
