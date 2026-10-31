/* Session auth middleware for TanStack Start.
 *
 * Verifies the `flash-ar-session` httpOnly cookie on each server-function
 * request and adds `db` (D1) and `userId` to the server function context.
 * Replaces the old Supabase auth-attacher middleware.
 */

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { makeDb } from "@/lib/db";
import { verifySession, getSessionToken } from "@/lib/auth";

export const attachSessionAuth = createMiddleware({ type: "function" }).server(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ next, context }: any) => {
    const request = getRequest();
    const token = request ? getSessionToken(request) : null;
    const userId = token ? (await verifySession(context?.env, token))?.id : null;

    return next({
      context: {
        ...(context?.context ?? {}),
        db: makeDb(context?.env),
        userId,
      },
    });
  },
);

export const requireSession = createMiddleware({ type: "function" }).server(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ next, context }: any) => {
    const userId = context?.context?.userId as string | undefined;
    if (!userId) {
      throw new Error("Unauthorized: No active session");
    }
    return next({
      context: {
        ...(context?.context ?? {}),
        db: makeDb(context?.env),
        userId,
      },
    });
  },
);
