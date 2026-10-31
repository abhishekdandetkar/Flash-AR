import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Disc3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canonicalLinks } from "@/lib/site";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Flash AR" },
      {
        name: "description",
        content: "How Flash AR collects, uses and protects your personal data.",
      },
    ],
    links: canonicalLinks("/privacy-policy"),
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser({ email: data.session?.user?.email || "admin" });
      }
    });
  }, []);

  const homeTo = user ? "/dashboard" : "/";

  return (
    <main className="min-h-screen bg-paper text-ink font-poppins">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
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
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
            Legal
          </p>
          <h1 className="font-poppins text-4xl font-extrabold md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-paper/60">Last updated: October 2026</p>
        </div>
      </section>

      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
          {[
            {
              title: "1. Information We Collect",
              body: "We collect information you provide directly to us, such as your email address and password when you create an account. We also collect information about how you use Flash AR, including albums you create, layers you add, and campaigns you publish. When you use our web application, we may automatically collect certain technical information such as your IP address, browser type, and device information.",
            },
            {
              title: "2. How We Use Your Information",
              body: "We use the information we collect to provide, maintain, and improve our services, process and store your AR campaigns, send you transactional emails such as account confirmation and password resets, respond to your comments and questions, and monitor and analyse usage patterns to improve your experience.",
            },
            {
              title: "3. Data Storage and Security",
              body: "Your data is stored securely on Supabase infrastructure. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.",
            },
            {
              title: "4. Sharing of Information",
              body: "We do not sell, trade, or otherwise transfer your personal information to third parties. We may share your information with trusted service providers who assist us in operating our application, conducting our business, or serving you, as long as those parties agree to keep this information confidential.",
            },
            {
              title: "5. Cookies",
              body: "We use session cookies to maintain your login state. We do not use tracking or advertising cookies. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent; however, some features of our service may not function properly without cookies.",
            },
            {
              title: "6. Your Rights",
              body: "You have the right to access, update, or delete your personal information at any time. You may also request that we stop processing your data. To exercise these rights, please contact us at privacy@flashar.app. We will respond to your request within 30 days.",
            },
            {
              title: "7. Children's Privacy",
              body: "Our service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information.",
            },
            {
              title: "8. Changes to This Policy",
              body: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last updated' date at the top of this page. We encourage you to review this Privacy Policy periodically.",
            },
            {
              title: "9. Contact Us",
              body: "If you have any questions about this Privacy Policy, please contact us at privacy@flashar.app or visit our Contact Us page.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="border-l-4 border-ink pl-6">
              <h2 className="font-poppins text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-6 px-6 py-6 text-sm text-ink/60">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </Link>
          <Link to="/refund-policy" className="hover:text-ink">
            Refund Policy
          </Link>
          <Link to="/contact" className="hover:text-ink">
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
