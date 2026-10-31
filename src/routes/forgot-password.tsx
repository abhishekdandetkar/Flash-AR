import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Disc3, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { user: { id: string; email: string } | null }) => {
        if (data.user) nav({ to: "/dashboard", replace: true });
      });
  }, [nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        toast.error("Failed to send reset link");
      } else {
        setSent(true);
      }
    } catch {
      toast.error("Failed to send reset link");
    } finally {
      setBusy(false);
    }
  };

  const homeTo = (() => {
    if (sent) return "/";
    return null;
  })();

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
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
            Account recovery
          </p>
          <h1 className="font-poppins text-4xl font-extrabold md:text-5xl">Reset your password</h1>
          <p className="mt-4 max-w-xl text-paper/70">
            Enter your email and we’ll send you a link to reset your password.
          </p>
        </div>
      </section>

      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            <div>
              <h2 className="font-poppins text-2xl font-bold mb-8">
                {sent ? "Check your email" : "Forgot password?"}
              </h2>
              {sent ? (
                <div className="border border-ink/15 p-8 text-center space-y-4">
                  <MailCheck className="mx-auto h-10 w-10" />
                  <h3 className="text-xl font-bold">Reset link sent</h3>
                  <p className="text-sm text-ink/60">
                    If an account exists for {email}, you’ll receive a password reset link shortly.
                  </p>
                  <Button
                    variant="outline"
                    className="border-ink text-ink hover:bg-ink hover:text-paper"
                    onClick={() => {
                      setSent(false);
                    }}
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                      Email
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
                    disabled={busy}
                    className="bg-ink text-paper hover:bg-ink/85 px-8"
                  >
                    {busy ? "Sending…" : "Send reset link"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
