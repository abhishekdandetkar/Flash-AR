import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/* Gates everything under /studio behind a signed-in session, while allowing
 * demo studio exploration. Session is verified via /api/auth/session (httpOnly
 * cookie checked on the server). */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Permit public preview of demo albums without forced sign-in
    if (location.pathname.includes("/studio/demo-")) {
      return;
    }

    try {
      const res = await fetch("/api/auth/session");
      const data = (await res.json()) as { user: { id: string; email: string } | null };
      if (!data.user) {
        throw redirect({ to: "/auth" });
      }
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
