import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Disc3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Flash AR" },
      { name: "description", content: "Choose a new password for your Flash AR account." },
      { property: "og:title", content: "Set a new password — Flash AR" },
      {
        property: "og:description",
        content: "Choose a new password for your Flash AR account.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const isRecovery = window.location.hash.includes("type=recovery");
      setReady(Boolean(data.session) && isRecovery);
    });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) toast.error(error.message);
      else {
        toast.success("Password updated — you're signed in");
        nav({ to: "/dashboard", replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink font-poppins">
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

      <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-center bg-ink text-paper p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/40 mb-6">
            Security
          </p>
          <h2 className="font-poppins text-4xl font-extrabold leading-tight">
            Secure your
            <br />
            account access.
          </h2>
          <p className="mt-6 text-sm text-paper/60 leading-relaxed max-w-sm">
            Choose a strong new password with at least 6 characters to keep your campaigns and
            published AR albums safe.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-12 bg-paper">
          <div className="w-full max-w-sm">
            {ready === null ? (
              <p className="py-4 text-center text-sm text-ink/60">Checking your reset link…</p>
            ) : !ready ? (
              <div className="border border-ink/15 p-8 text-center space-y-4">
                <h1 className="text-xl font-bold">Link expired or invalid</h1>
                <p className="text-sm text-ink/60">
                  Password reset links only work once. Request a fresh one from the sign-in page.
                </p>
                <Button asChild className="w-full bg-ink text-paper hover:bg-ink/85">
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="font-poppins text-2xl font-extrabold text-ink">
                    Set a new password
                  </h1>
                  <p className="mt-1 text-sm text-ink/55">Enter your new password below.</p>
                </div>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">
                      New password
                    </label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-ink text-paper hover:bg-ink/85"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="animate-spin" />} Update password
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
