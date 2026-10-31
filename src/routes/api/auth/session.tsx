/* GET /api/auth/session — return the current session user, or null. */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { verifySession, getSessionToken } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const request = getRequest();
        const token = request ? getSessionToken(request) : null;
        const user = token ? await verifySession(env, token) : null;
        return new Response(JSON.stringify({ user }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
