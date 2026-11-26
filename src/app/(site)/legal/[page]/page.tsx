import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Placeholder legal pages. Final text must be written/reviewed before launch;
 * these pages deliberately contain no invented legal terms.
 */
const PAGES: Record<string, { title: string; intro: string }> = {
  "affiliate-disclosure": {
    title: "Affiliate Disclosure",
    intro:
      "8Tasks may earn a commission when you join a provider through links on this site. This does not change what you are paid by the provider. Providers handle sign-up, tasks, verification and payments.",
  },
  "earning-disclaimer": {
    title: "Earning Disclaimer",
    intro:
      "8Tasks does not employ taskers or pay users, and earnings are never guaranteed. What you can earn, and when you are paid, depends entirely on each provider's own terms.",
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Our full privacy policy is being prepared.",
  },
  terms: {
    title: "Terms of Use",
    intro: "Our full terms of use are being prepared.",
  },
};

type Props = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = PAGES[(await params).page];
  return p ? { title: p.title } : {};
}

export default async function LegalPage({ params }: Props) {
  const p = PAGES[(await params).page];
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="mb-3 inline-block rounded-full bg-amber-300/30 px-3 py-1 text-xs font-medium">
        Draft: full text pending review
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-4 text-muted-foreground">{p.intro}</p>
    </article>
  );
}
