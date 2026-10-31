/* Serves campaign media and compiled .mind targets from R2 storage.
 * Paths are <owner-uuid>/<campaign-id>/<file>; the campaign must exist
 * and belong to that owner, or be a built-in demo target.
 * Public route — no auth required (scan page is public).
 */

import { createFileRoute } from "@tanstack/react-router";
import { makeDb, dbGetOne } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[A-Za-z0-9._-]{1,80}$/;

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mind: "application/octet-stream",
};

export const Route = createFileRoute("/api/public/assets/$")({
  server: {
    handlers: {
      GET: async ({ context, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const db = makeDb(env);
        const bucket = (env as { ASSETS?: R2Bucket }).ASSETS;
        if (!bucket) {
          return new Response("R2 bucket 'ASSETS' not configured", { status: 500 });
        }

        const splat = (params as Record<string, string | undefined>)["_splat"] ?? "";
        const parts = splat.split("/").filter(Boolean);
        if (parts.length !== 3) return new Response(null, { status: 404 });
        const owner = parts[0]!;
        const campaignId = parts[1]!;
        const file = parts[2]!;
        if (
          !UUID_RE.test(owner) ||
          !NAME_RE.test(campaignId) ||
          !NAME_RE.test(file) ||
          file.includes("..")
        )
          return new Response(null, { status: 404 });

        // Verify campaign ownership (or demo campaign)
        const row = await dbGetOne(db, "SELECT owner_id FROM campaigns WHERE id = ?", campaignId);
        const isDemo = campaignId.startsWith("demo-");
        if (!row && !isDemo) return new Response(null, { status: 404 });
        if (row && row["owner_id"] !== owner) return new Response(null, { status: 404 });

        const object = await bucket.get(`${owner}/${campaignId}/${file}`);
        if (!object) return new Response(null, { status: 404 });

        const kind = file.split(".").pop()?.toLowerCase() ?? "";
        const body = await object.arrayBuffer();
        return new Response(body, {
          headers: {
            "content-type": MIME[kind] ?? "application/octet-stream",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
