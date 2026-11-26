import Link from "next/link";
import { AffiliateNotice } from "./affiliate-notice";
import { Logo } from "./logo";
import { LEGAL_ITEMS, NAV_ITEMS } from "./nav-items";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="w-fit rounded-xl bg-navy px-3 py-2 text-white">
            <Logo />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Discover earning opportunities from third-party providers. 8Tasks
            doesn&apos;t employ taskers, hold funds or pay users.
          </p>
          <AffiliateNotice />
        </div>
        <nav aria-label="Footer" className="space-y-3">
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="hover:text-foreground">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal" className="space-y-3">
          <h2 className="text-sm font-semibold">Legal</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {LEGAL_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="hover:text-foreground">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 8Tasks
      </div>
    </footer>
  );
}
