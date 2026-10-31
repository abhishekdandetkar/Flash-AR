import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/* Gates everything under /studio behind a signed-in session, while allowing demo studio exploration. */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Permit public preview of demo albums without forced sign-in
    if (location.pathname.includes("/studio/demo-")) {
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
