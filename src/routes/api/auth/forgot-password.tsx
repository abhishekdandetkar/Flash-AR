/* POST /api/auth/forgot-password — send a password reset link.
 * In production, this sends an email with a one-time reset token.
 * For now, it accepts the email and returns success (email sending
 * requires an SMTP provider to be configured).
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email } = (await request.json()) as { email: string };
        if (!email) {
          return new Response(JSON.stringify({ error: "Email is required" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        // TODO: Send reset email via SMTP provider (Resend, SendGrid, etc.)
        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
