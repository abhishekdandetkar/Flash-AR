import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Disc3 } from "lucide-react";
import { useEffect, useState } from "react";
import { canonicalLinks } from "@/lib/site";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Flash AR" },
      { name: "description", content: "Flash AR's refund and cancellation policy." },
    ],
    links: canonicalLinks("/refund-policy"),
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
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
          <h1 className="font-poppins text-4xl font-extrabold md:text-5xl">Refund Policy</h1>
          <p className="mt-3 text-sm text-paper/60">Last updated: October 2026</p>
        </div>
      </section>

      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
          {[
            {
              title: "1. Free Tier",
              body: "Flash AR offers a free tier that allows you to create and publish WebAR album campaigns at no cost. No payment is required to access the core features of the Service, and therefore no refunds are applicable for free-tier usage.",
            },
            {
              title: "2. Paid Subscriptions",
              body: "If Flash AR introduces paid subscription plans in the future, we will offer a 14-day refund window from the date of your initial subscription purchase. To request a refund within this period, please contact us at billing@flashar.app with your account email and reason for the request.",
            },
            {
              title: "3. Eligibility for Refunds",
              body: "Refunds may be granted under the following circumstances: you were charged in error, you experienced a technical issue that prevented you from using the Service and our support team was unable to resolve it, or you requested a refund within 14 days of your first payment. We reserve the right to decline refund requests that do not meet these criteria.",
            },
            {
              title: "4. Non-Refundable Items",
              body: "The following are generally non-refundable: subscription fees for periods already used, one-time purchases of additional storage or features after the 14-day window has elapsed, and any charges incurred as a result of a violation of our Terms and Conditions.",
            },
            {
              title: "5. Cancellations",
              body: "You may cancel your subscription at any time from your account settings. Upon cancellation, your subscription will remain active until the end of the current billing period. You will not be charged for subsequent billing periods after cancellation. Cancellation does not automatically trigger a refund for the current billing period unless it falls within the 14-day refund window.",
            },
            {
              title: "6. Processing Refunds",
              body: "Approved refunds will be processed to the original payment method within 5–10 business days, depending on your bank or card provider. We will notify you by email once your refund has been processed.",
            },
            {
              title: "7. Disputes",
              body: "If you believe you have been incorrectly charged or have a dispute regarding a charge, please contact us at billing@flashar.app before initiating a chargeback with your bank. We are committed to resolving billing issues fairly and promptly.",
            },
            {
              title: "8. Contact for Refund Requests",
              body: "To request a refund or ask questions about our refund policy, please email billing@flashar.app or use the Contact Us page. Please include your account email address and a description of your issue to help us resolve it quickly.",
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
          <Link to="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </Link>
          <Link to="/contact" className="hover:text-ink">
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
