/* POST /api/auth/signout — clear the session cookie. */

import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async () => {
        const res = new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
        return clearSessionCookie(res);
      },
    },
  },
});
