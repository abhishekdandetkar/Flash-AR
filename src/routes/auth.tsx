import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Disc3, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Flash AR" },
      { name: "description", content: "Sign in to build and publish WebAR album campaigns." },
      { property: "og:title", content: "Sign in — Flash AR" },
      {
        property: "og:description",
        content: "Sign in to build and publish WebAR album campaigns.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

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

    const normEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Authentication failed");
        return;
      }
      nav({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Authentication failed");
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
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      {/* Split layout */}
      <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-2">
        {/* Left panel — branding */}
        <div className="hidden lg:flex flex-col justify-between bg-ink text-paper p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/40 mb-8">
              WebAR Studio
            </p>
            <h2 className="font-poppins text-4xl font-extrabold leading-tight">
              Make every sleeve
              <br />
              play when scanned.
            </h2>
            <p className="mt-6 text-sm text-paper/60 leading-relaxed max-w-sm">
              Upload artwork, layer video, audio and 3D on top, then publish a scannable QR. No app
              install — just a camera.
            </p>
          </div>
          <div className="border-t border-paper/15 pt-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                ["100%", "In-browser"],
                ["Any phone", "Any camera"],
                ["One tap", "Publish QR"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-lg font-extrabold">{v}</p>
                  <p className="text-xs text-paper/50 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex items-center justify-center px-6 py-12 bg-paper">
          <div className="w-full max-w-sm">
            {awaitingConfirm ? (
              <div className="border border-ink/15 p-8 text-center space-y-4">
                <Mail className="mx-auto h-10 w-10" />
                <h1 className="text-xl font-bold">Check your inbox</h1>
                <p className="text-sm text-ink/60">
                  We sent a confirmation link to{" "}
                  <span className="font-semibold text-ink">{email}</span>. Click it to activate your
                  account.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-ink text-ink hover:bg-ink hover:text-paper"
                  onClick={() => setAwaitingConfirm(false)}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="font-poppins text-2xl font-extrabold text-ink">
                    {mode === "signin" ? "Welcome back" : "Create account"}
                  </h1>
                  <p className="mt-1 text-sm text-ink/55">
                    {mode === "signin"
                      ? "Sign in to your Flash AR account."
                      : "Start building WebAR experiences for free."}
                  </p>
                </div>

                {/* Tab switch */}
                <div className="flex border border-ink/20">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2.5 text-sm font-semibold transition ${
                        mode === m ? "bg-ink text-paper" : "bg-paper text-ink/50 hover:text-ink"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Create account"}
                    </button>
                  ))}
                </div>

                {/* Email / password form */}
                <form onSubmit={submit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">
                      Email
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">
                      Password
                    </label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-ink text-paper hover:bg-ink/85"
                    disabled={busy}
                  >
                    {busy && <Loader2 className="animate-spin" />}
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </form>

                {mode === "signin" && (
                  <p className="text-center text-xs">
                    <Link to="/forgot-password" className="text-ink/50 underline hover:text-ink">
                      Forgot your password?
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
