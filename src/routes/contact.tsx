import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Disc3, Mail, MessageSquare, Clock } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canonicalLinks } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Flash AR" },
      { name: "description", content: "Get in touch with the Flash AR team." },
    ],
    links: canonicalLinks("/contact"),
  }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser({ email: data.session?.user?.email || "admin" });
      }
    });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you shortly.");
  };

  const homeTo = user ? "/dashboard" : "/";

  return (
    <main className="min-h-screen bg-paper text-ink font-poppins">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to={homeTo}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
          >
            <Disc3 className="h-6 w-6" /> Flash AR
          </Link>
          <Link
            to={homeTo}
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> {user ? "Back to dashboard" : "Back to home"}
          </Link>
        </div>
      </header>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
            Get in touch
          </p>
          <h1 className="font-poppins text-4xl font-extrabold md:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-xl text-paper/70">
            Have a question, feedback, or a billing inquiry? We're here to help. Send us a message
            or reach out via email.
          </p>
        </div>
      </section>

      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            <div>
              <h2 className="font-poppins text-2xl font-bold mb-8">Send us a message</h2>
              {sent ? (
                <div className="border border-ink/15 p-8 text-center space-y-4">
                  <MessageSquare className="mx-auto h-10 w-10 text-ink" />
                  <h3 className="text-xl font-bold">Message received!</h3>
                  <p className="text-sm text-ink/60">
                    Thanks for reaching out. We aim to reply within 1–2 business days.
                  </p>
                  <Button
                    variant="outline"
                    className="border-ink text-ink hover:bg-ink hover:text-paper"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                        Name *
                      </label>
                      <Input
                        required
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                        Email *
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
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                      Subject *
                    </label>
                    <Input
                      required
                      placeholder="How can we help?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/60">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Tell us what's on your mind..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full border border-ink/20 bg-paper p-3 text-sm text-ink placeholder:text-ink/30 outline-none focus:border-ink resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="bg-ink text-paper hover:bg-ink/85 px-8"
                  >
                    {busy ? "Sending…" : "Send message"}
                  </Button>
                </form>
              )}
            </div>

            <div className="space-y-6">
              <div className="border border-ink/10 p-6">
                <div className="flex items-start gap-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 mb-1">
                      General enquiries
                    </p>
                    <a
                      href="mailto:hello@flashar.app"
                      className="text-sm font-medium hover:underline"
                    >
                      hello@flashar.app
                    </a>
                  </div>
                </div>
              </div>
              <div className="border border-ink/10 p-6">
                <div className="flex items-start gap-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 mb-1">
                      Billing &amp; refunds
                    </p>
                    <a
                      href="mailto:billing@flashar.app"
                      className="text-sm font-medium hover:underline"
                    >
                      billing@flashar.app
                    </a>
                  </div>
                </div>
              </div>
              <div className="border border-ink/10 p-6">
                <div className="flex items-start gap-4">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/50 mb-1">
                      Response time
                    </p>
                    <p className="text-sm text-ink/70">
                      We typically respond within 1–2 business days.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-ink text-paper p-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
                  Quick links
                </p>
                <ul className="space-y-2 text-sm mt-3">
                  <li>
                    <Link to="/privacy-policy" className="text-paper/70 hover:text-paper">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-paper/70 hover:text-paper">
                      Terms &amp; Conditions
                    </Link>
                  </li>
                  <li>
                    <Link to="/refund-policy" className="text-paper/70 hover:text-paper">
                      Refund Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/forgot-password" className="text-paper/70 hover:text-paper">
                      Forgot Password
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-6 text-sm text-ink/60">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <Link to="/privacy-policy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </Link>
          <Link to="/refund-policy" className="hover:text-ink">
            Refund Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
