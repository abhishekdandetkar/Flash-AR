/* POST /api/auth/reset-password — update the user's password.
 * Requires an active session (httpOnly cookie).
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { makeDb, dbExec } from "@/lib/db";
import { getSessionToken, verifySession, hashPassword } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ context, request }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const db = makeDb(env);

        const req = getRequest();
        const token = req ? getSessionToken(req) : null;
        const user = token ? await verifySession(env, token) : null;
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { password } = (await request.json()) as { password: string };
        if (!password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Password too short" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const passwordHash = await hashPassword(password);
        await dbExec(db, "UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, user.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
