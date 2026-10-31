/* POST /api/auth/signup — create a new user account.
 * Body: { email: string, password: string }
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { makeDb, dbExec } from "@/lib/db";
import { createUser, hashPassword, signSessionToken, setSessionCookie } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ context, request }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env = (context as any)?.env;
        const db = makeDb(env);
        const { email, password } = (await request.json()) as {
          email: string;
          password: string;
        };

        const existing = await db
          .prepare("SELECT id FROM users WHERE email = ?")
          .bind(email)
          .first();
        if (existing) {
          return new Response(JSON.stringify({ error: "Email already registered" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          });
        }

        const passwordHash = await hashPassword(password);
        const userId = await createUser(env, email, passwordHash);
        const token = await signSessionToken(env, { id: userId, email });

        const res = new Response(JSON.stringify({ success: true, user: { id: userId, email } }), {
          headers: { "content-type": "application/json" },
        });
        return setSessionCookie(res, token);
      },
    },
  },
});
