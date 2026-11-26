import Link from "next/link";
import { AffiliateDisclosure } from "./affiliate-disclosure";
import { BrandWordmark } from "./brand-wordmark";
import { Container } from "./container";

const EARN_LINKS = [
  { href: "/earn/capture-earn", label: "Capture & Earn" },
  { href: "/earn/write-earn", label: "Write & Earn" },
  { href: "/earn/film-earn", label: "Film & Earn" },
  { href: "/earn/review-earn", label: "Review & Earn" },
  { href: "/earn/promote-earn", label: "Promote & Earn" },
];

const LINKS = [
  { href: "/providers", label: "Providers" },
  { href: "/about", label: "About" },
  { href: "/daily-8", label: "My Daily 8 Email" },
  { href: "/for-brands", label: "For Brands" },
  { href: "/submit-provider", label: "Suggest a Company" },
  { href: "/contact", label: "Contact" },
  { href: "/press", label: "Press" },
  { href: "/legal/free-access", label: "Free Access Policy" },
  { href: "/legal/affiliate-disclosure", label: "Affiliate Disclosure" },
  { href: "/legal/earning-disclaimer", label: "Earning Disclaimer" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/admin/login", label: "Staff Admin" },
];

/** Trust, disclosure and legal links (design spec §8 item 11). */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-surface/40">
      <Container className="flex flex-col gap-5 py-8">
        <div className="flex flex-col gap-1">
          <BrandWordmark />
          <p className="text-sm font-medium text-emerald">Small Missions. Real Money.</p>
          <p className="text-sm font-semibold">Always Free. For Everyone.</p>
        </div>
        <p className="max-w-2xl text-[13px] text-text-2">
          8Tasks is an independent discovery site. We don&apos;t employ taskers, hold your money,
          check your work or pay users. Third-party providers do that directly under their own
          terms.
        </p>
        <AffiliateDisclosure siteWide className="max-w-2xl" />
        <nav aria-label="Ways to earn">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {EARN_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-text-2 underline-offset-4 hover:text-foreground hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal and site">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-text-2 underline-offset-4 hover:text-foreground hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-text-2">© {new Date().getFullYear()} 8Tasks.com</p>
      </Container>
    </footer>
  );
}
