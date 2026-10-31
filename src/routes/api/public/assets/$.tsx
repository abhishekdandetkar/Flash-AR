import { createFileRoute } from "@tanstack/react-router";

/* Serves campaign media and compiled .mind targets from the private
 * "ar-assets" bucket to any device (the scan page is public). Paths are
 * <owner-uuid>/<campaign-id>/<file>; the campaign must exist and belong to
 * that owner, or be a built-in demo target. */

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
      GET: async ({ params }) => {
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("campaigns")
          .select("owner_id")
          .eq("id", campaignId)
          .maybeSingle();
        if (!row) {
          if (!campaignId.startsWith("demo-")) return new Response(null, { status: 404 });
        } else if (row.owner_id !== owner) {
          return new Response(null, { status: 404 });
        }

        const { data: blob, error } = await supabaseAdmin.storage
          .from("ar-assets")
          .download(`${owner}/${campaignId}/${file}`);
        if (error || !blob) return new Response(null, { status: 404 });

        const kind = file.split(".").pop()?.toLowerCase() ?? "";
        return new Response(blob, {
          headers: {
            "content-type": MIME[kind] ?? "application/octet-stream",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
