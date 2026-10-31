import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Disc3 } from "lucide-react";
import { useEffect, useState } from "react";
import { canonicalLinks } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Flash AR" },
      {
        name: "description",
        content: "The terms and conditions governing your use of Flash AR.",
      },
    ],
    links: canonicalLinks("/terms"),
  }),
  component: Terms,
});

function Terms() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    // Session is checked via httpOnly cookie on the server; client-side
    // auth state is derived from the cookie on subsequent loads.
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
          <h1 className="font-poppins text-4xl font-extrabold md:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-sm text-paper/60">Last updated: October 2026</p>
        </div>
      </section>

      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By accessing or using Flash AR ('Service'), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not access or use the Service. These terms apply to all visitors, users, and others who access or use the Service.",
            },
            {
              title: "2. Description of Service",
              body: "Flash AR is a browser-based WebAR platform that enables users to create image-tracked augmented reality experiences for album covers, vinyl sleeves, and photo albums. The Service allows users to upload artwork, layer media content, and publish scannable QR codes for AR playback.",
            },
            {
              title: "3. User Accounts",
              body: "You must create an account to access certain features of the Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You must notify us immediately upon becoming aware of any breach of security or unauthorised use of your account.",
            },
            {
              title: "4. User Content",
              body: "You retain all ownership rights to the content you upload, including artwork, images, audio, and video files. By uploading content to Flash AR, you grant us a non-exclusive, worldwide, royalty-free licence to store, process, and display your content solely for the purpose of providing the Service. You represent and warrant that you own or have the necessary rights to all content you upload.",
            },
            {
              title: "5. Prohibited Uses",
              body: "You agree not to use the Service to upload content that infringes any intellectual property rights, is unlawful, harmful, threatening, abusive, harassing, or defamatory, contains viruses or any other harmful code, or violates any applicable laws or regulations. We reserve the right to terminate accounts that violate these prohibitions.",
            },
            {
              title: "6. Intellectual Property",
              body: "The Service and its original content, features, and functionality are and will remain the exclusive property of Flash AR and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.",
            },
            {
              title: "7. Limitation of Liability",
              body: "To the maximum extent permitted by applicable law, Flash AR shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the Service.",
            },
            {
              title: "8. Disclaimer of Warranties",
              body: "The Service is provided on an 'AS IS' and 'AS AVAILABLE' basis without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.",
            },
            {
              title: "9. Termination",
              body: "We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms. Upon termination, your right to use the Service will immediately cease.",
            },
            {
              title: "10. Changes to Terms",
              body: "We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.",
            },
            {
              title: "11. Governing Law",
              body: "These Terms shall be governed and construed in accordance with applicable laws, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.",
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
          <Link to="/privacy-policy" className="hover:text-ink">
            Privacy Policy
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
