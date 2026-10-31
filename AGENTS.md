## Architecture

- User campaigns live in Supabase (public.campaigns; RLS: public read so any phone can scan, owner-only writes). Cover images, layer media and compiled .mind files go to the private "ar-assets" storage bucket and are served cross-device through the /api/public/assets/* route (the bucket itself is not public).
- Demo campaigns stay device-local in IndexedDB (src/lib/demos.ts seedDemos) — their artwork is bundled, so they work on any phone without the backend.
- Managing albums requires sign-in (email/password + Google); studio routes sit under the _authenticated layout. Scan (/scan/$id) and print are public.
- MindAR compiler and A-Frame scanner load from CDN at runtime (src/lib/mindar.ts) — keeps heavy tfjs/three out of the SSR bundle.
- Layer coordinates are in target-width units centered on the cover (y up) — shared by the 2D editor/simulator and the A-Frame AR scene.

## Conventions

- npm is the package manager (use `package-lock.json`; do not introduce bun/pnpm lockfiles alongside it).
- Quality gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` must all pass after any change.
- Canonical brand name is **Flash AR**; the site name lives in src/lib/site.ts.
- Never commit secrets; `.env` is git-ignored. Publishable keys are the only env values that may ship to the client.
- Layer coordinates are target-width units (centered, y up) — keep the editor, simulator and A-Frame scene consistent with this.
- Do not rewrite published git history.
