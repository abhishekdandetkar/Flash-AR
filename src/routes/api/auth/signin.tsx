/* POST /api/auth/signin — sign in with email + password.
 * Body: { email: string, password: string }
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { makeDb, dbGetOne } from "@/lib/db";
import { verifyPassword, signSessionToken, setSessionCookie } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/signin")({
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

        const user = await dbGetOne(db, "SELECT * FROM users WHERE email = ?", email);
        if (!user) {
          return new Response(JSON.stringify({ error: "Invalid email or password" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const valid = await verifyPassword(password, user["password_hash"] as string);
        if (!valid) {
          return new Response(JSON.stringify({ error: "Invalid email or password" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const token = await signSessionToken(env, {
          id: user["id"] as string,
          email: user["email"] as string,
        });
        const res = new Response(
          JSON.stringify({ success: true, user: { id: user["id"], email: user["email"] } }),
          {
            headers: { "content-type": "application/json" },
          },
        );
        return setSessionCookie(res, token);
      },
    },
  },
});
