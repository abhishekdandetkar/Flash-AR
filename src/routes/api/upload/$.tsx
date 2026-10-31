/* POST /api/upload — upload a file to R2 storage.
 * FormData: { path: string, file: File }
 * Returns: { url: string }
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

export const Route = createFileRoute("/api/upload/$")({
  server: {
    handlers: {
      POST: async ({ context }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const bucket = (env as { ASSETS?: R2Bucket }).ASSETS;
        if (!bucket) {
          return new Response("R2 bucket 'ASSETS' not configured", { status: 500 });
        }

        const request = getRequest();
        const formData = await request.formData();
        const path = formData.get("path") as string;
        const file = formData.get("file") as File;

        if (!path || !file) {
          return new Response("Missing path or file", { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(path, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
        });

        return new Response(JSON.stringify({ url: `/api/public/assets/${path}` }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
