import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { copyFor } from "@/lib/for-brands-copy";
import { forBrandsOffers, SITE_LINKS } from "@/lib/site-links";

export const metadata: Metadata = {
  alternates: { canonical: "/for-brands" },
  title: "For Brands",
  description: "Tools for brands that 8Tasks refers to as an independent affiliate.",
};

const PAGE_DISCLOSURE =
  "8Tasks may earn a referral commission if you sign up through these links. We are an independent referral affiliate, not a partner or agent of the companies listed.";

/** Brand-side placements from the link map (status live + placement for_brands_page). */
export default function ForBrandsPage() {
  const offers = forBrandsOffers(SITE_LINKS);
  return (
    <Container className="flex max-w-2xl flex-col gap-5 pt-5 sm:pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
          For Brands
        </h1>
        <p className="text-[15px] text-text-2">
          8Tasks is an earning-opportunity directory that is just getting started. If you run a
          brand, these third-party services may help you work with creators.
        </p>
      </header>

      <p className="flex items-start gap-2 rounded-2xl border bg-surface p-4 text-sm text-text-2">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        {PAGE_DISCLOSURE}
      </p>

      {offers.length === 0 ? (
        <EmptyState title="No brand offers right now" description="Check back later." />
      ) : (
        <ul className="flex flex-col gap-3">
          {offers.map((o) => {
            const copy = copyFor(o.provider_id, o.name ?? o.provider_id);
            return (
              <li key={o.provider_id}>
                <article className="flex flex-col gap-3 rounded-2xl border bg-surface p-4">
                  <h2 className="text-lg font-semibold leading-snug">{copy.heading}</h2>
                  <p className="text-[15px] text-text-2">{copy.body}</p>
                  <a
                    href={o.href}
                    rel="sponsored noopener"
                    target="_blank"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action/80"
                  >
                    {copy.ctaLabel}
                    <ExternalLink className="size-4" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <p className="text-xs leading-relaxed text-text-2">{copy.disclosure}</p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-text-2">
        Does your company pay people for tasks, testing or content?{" "}
        <Link href="/submit-provider" className="font-medium text-emerald hover:underline">
          Suggest your company
        </Link>{" "}
        for the earner directory. Listing is free and reviewed by hand.
      </p>
    </Container>
  );
}
