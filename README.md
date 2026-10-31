# Flash AR

Flash AR is a WebAR SaaS platform for interactive album experiences — vinyl sleeves, music album covers, and photo albums — built on MindAR image tracking.

## Features

- **In-browser MindAR compiler** — compile target images into `.mind` files client-side, with progress feedback, feature-point visualization, and a tracking-quality score (contrast/feature density).
- **Album campaign studio** — upload targets, manage multi-layer AR overlays (video with chroma-key, synced audio, 3D vinyl/sleeve models, CTA badges), and fine-tune each layer in a canvas editor with a simulator.
- **Instant simulator** — test a campaign by mimicking a camera lock on the album cover, without a phone.
- **Mobile WebAR scanner** — public `/scan/:campaignId` route that runs MindAR tracking in the phone's browser camera, with permission and alignment guides.
- **QR publishing** — downloadable QR code, share URL, and printable campaign card/flyer per campaign.
- **Ready-to-test demos** — bundled demo albums work offline on any device (artwork and data stay device-local in IndexedDB).

## Tech stack

- TanStack Start (React 19) + TypeScript, Tailwind CSS 4
- TanStack Router file-based routes (SSR via Nitro, targeted at Cloudflare Workers)
- Cloudflare D1 (SQLite) for user campaign data
- Cloudflare R2 for media + `.mind` asset storage
- Cookie-based JWT auth (httpOnly session cookie)
- MindAR / A-Frame loaded from CDN at runtime

## Development

```sh
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

### Environment variables

| Variable              | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `VITE_SITE_URL`       | Canonical site origin, used for sitemap/robots/OG metadata (optional in dev)    |
| `SESSION_SECRET`      | Server-only secret for signing session JWTs (set via `wrangler secret put`)     |
| `D1_DATABASE_ID`      | D1 database ID (from `wrangler d1 create flash-ar`)                             |
| `R2_BUCKET_NAME`      | R2 bucket name for asset storage (default: `flash-ar-assets`)                   |

`.env` is git-ignored; never commit secrets.

### Scripts

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the dev server                                 |
| `npm run build`     | Production build (Nitro, `cloudflare-module` preset) |
| `npm run preview`   | Preview the production build                         |
| `npm run typecheck` | `tsc --noEmit`                                       |
| `npm run lint`      | ESLint (+ Prettier integration)                      |
| `npm test`          | Vitest unit tests                                    |
| `npm run format`    | Prettier                                             |

## Architecture

- User campaigns live in Cloudflare D1 (`campaigns` table; D1 queries enforce owner-only writes, public read for scanned campaigns). Cover images, layer media, and compiled `.mind` files go to Cloudflare R2 (`flash-ar-assets` bucket) and are served cross-device through `/api/public/assets/*`.
- Demo campaigns stay device-local in IndexedDB (`src/lib/demos.ts`) — their artwork is bundled, so they work on any phone without the backend.
- Managing albums requires sign-in (email/password via cookie-based JWT sessions); studio routes sit under the `_authenticated` layout. `/scan/$id` and `/print/$id` are public.
- Layer coordinates use target-width units centered on the cover (y up) — shared by the 2D editor/simulator and the A-Frame AR scene.

## Deployment

The build targets Cloudflare Workers (`nitro` `cloudflare-module` preset → `wrangler.json` in `.output/server/`); see `PLAN.md` for the migration and production deployment checklist.
