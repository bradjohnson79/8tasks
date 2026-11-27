import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/app/static-page";
import { OPERATOR } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description: "8Tasks helps you discover legitimate ways to earn extra money. Always free.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <StaticPage
      title="About 8Tasks"
      intro="Small Missions. Real Money. 8Tasks helps people in Canada and the United States discover legitimate ways to earn extra money: surveys, app testing, photography, mystery shopping, content creation, paid research and more."
    >
      <p className="text-lg font-semibold text-emerald">Always Free. For Everyone.</p>
      <p>
        Browsing, searching, saving and alerts are free for everyone, with no paid tiers or locked
        listings. See our <Link href="/legal/free-access">Free Access Policy</Link>.
      </p>
      <h2>How it works</h2>
      <p>
        We research earning platforms and list the ones that accept members in Canada or the US.
        When you choose one, you sign up on the provider&apos;s own site. Providers set the tasks,
        check the work and pay you directly. 8Tasks never employs taskers, holds your money or pays
        users.
      </p>
      <h2>How we make money</h2>
      <p>
        Some providers pay us a referral commission when you join through our links. That never
        changes what you&apos;re paid. Read our{" "}
        <Link href="/legal/affiliate-disclosure">Affiliate Disclosure</Link>.
      </p>
      <h2>Who runs 8Tasks</h2>
      <p>
        8Tasks is operated by {OPERATOR.legalName}, based in {OPERATOR.locality}, {OPERATOR.region},{" "}
        {OPERATOR.country}. Reach us at <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> or
        see <Link href="/contact">Contact</Link>.
      </p>
      <h2>Spot something wrong?</h2>
      <p>
        Every listing has a “Report an inaccurate opportunity” link. A person reviews every report.
      </p>
    </StaticPage>
  );
}
