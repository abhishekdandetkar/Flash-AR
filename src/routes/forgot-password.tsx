import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Disc3, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Flash AR" },
      {
        name: "description",
        content: "Request a password reset link for your Flash AR account.",
      },
      { property: "og:title", content: "Reset your password — Flash AR" },
      {
        property: "og:description",
        content: "Request a password reset link for your Flash AR account.",
      },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard", replace: true });
    });
  }, [nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink font-poppins">
      {/* Header */}
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
          >
            <Disc3 className="h-6 w-6" /> Flash AR
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </header>

      {/* Split layout */}
      <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center bg-ink text-paper p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/40 mb-6">
            Account recovery
          </p>
          <h2 className="font-poppins text-4xl font-extrabold leading-tight">
            Locked out?
            <br />
            We've got you.
          </h2>
          <p className="mt-6 text-sm text-paper/60 leading-relaxed max-w-sm">
            Enter your email address below and we'll send you a link to reset your password. The
            link expires after 24 hours.
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex items-center justify-center px-6 py-12 bg-paper">
          <div className="w-full max-w-sm">
            {sent ? (
              <div className="border border-ink/15 p-8 text-center space-y-4">
                <MailCheck className="mx-auto h-10 w-10" />
                <h1 className="text-xl font-bold">Check your inbox</h1>
                <p className="text-sm text-ink/60">
                  We sent a reset link to <span className="font-semibold text-ink">{email}</span>.
                  Follow the link to set a new password.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-ink text-ink hover:bg-ink hover:text-paper"
                  onClick={() => setSent(false)}
                >
                  Try a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="font-poppins text-2xl font-extrabold text-ink">
                    Forgot your password?
                  </h1>
                  <p className="mt-1 text-sm text-ink/55">
                    Enter your account email and we'll send you a reset link.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">
                      Email address
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-ink text-paper hover:bg-ink/85"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="animate-spin" />}
                    Send reset link
                  </Button>
                </form>

                <p className="text-center text-xs text-ink/50">
                  Remembered it?{" "}
                  <Link to="/auth" className="underline hover:text-ink">
                    Back to sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
