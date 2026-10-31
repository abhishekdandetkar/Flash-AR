import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Disc3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    // In the cookie-based auth model, password reset is handled via email
    // links that verify a one-time token. For now, we allow direct password
    // updates when the user is already authenticated.
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { user: { id: string; email: string } | null }) => {
        setReady(Boolean(data.user));
      })
      .catch(() => setReady(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update password");
        return;
      }
      toast.success("Password updated — you're signed in");
      nav({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  if (ready === null) {
    return (
      <main className="min-h-screen bg-paper text-ink font-poppins flex items-center justify-center">
        <p className="text-sm text-ink/60">Loading…</p>
      </main>
    );
  }

  if (!ready) {
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
              account
            </h2>
          </div>
          <div className="flex items-center justify-center px-6 py-12 bg-paper">
            <div className="w-full max-w-sm">
              <div className="border border-ink/15 p-8 text-center space-y-4">
                <h3 className="text-xl font-bold">Authentication required</h3>
                <p className="text-sm text-ink/60">Please sign in to reset your password.</p>
                <Button asChild className="bg-ink text-paper hover:bg-ink/85">
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
            account
          </h2>
          <p className="mt-6 text-sm text-paper/60 leading-relaxed max-w-sm">
            Choose a strong new password for your Flash AR account.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-12 bg-paper">
          <div className="w-full max-w-sm">
            <h1 className="font-poppins text-2xl font-extrabold text-ink mb-6">
              Set a new password
            </h1>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
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
                disabled={busy}
                className="bg-ink text-paper hover:bg-ink/85 px-8"
              >
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
