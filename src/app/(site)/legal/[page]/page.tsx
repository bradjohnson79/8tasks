import type { Metadata } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/effective";
import { renderMarkdown } from "@/lib/legal/markdown";
import { OPERATOR } from "@/lib/seo";

/**
 * Legal pages. Full text lives in content/legal/<page>.md (founder's legal package). A page
 * without a file, or whose file still contains a "[CONFIRM" marker, shows the Draft banner.
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
  "free-access": {
    title: "Free Access Policy",
    intro:
      "8Tasks is always free for everyone. There are no paid memberships, premium tiers, locked categories or paid alerts.",
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "Our full privacy policy is being prepared. In short: browsing needs no account, and you can ask us to export or delete your data at any time.",
  },
  terms: {
    title: "Terms of Use",
    intro: "Our full terms of use are being prepared.",
  },
};

function content(slug: string): string | null {
  const file = join(process.cwd(), "content", "legal", `${slug}.md`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

type Props = { params: Promise<{ page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).page;
  const p = PAGES[slug];
  return p ? { title: p.title, alternates: { canonical: `/legal/${slug}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const slug = (await params).page;
  const p = PAGES[slug];
  if (!p) notFound();
  const md = content(slug);
  const draft = !md || md.includes("[CONFIRM");
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {draft && (
        <p className="mb-3 inline-block rounded-full bg-amber-300/30 px-3 py-1 text-xs font-medium">
          Draft: full text pending review
        </p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
      {md ? (
        <>
          <p className="mt-2 text-sm text-text-2">Effective date: {LEGAL_EFFECTIVE_DATE}</p>
          <div className="legal-prose mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-text-2 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-2 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
            {renderMarkdown(md)}
          </div>
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">{p.intro}</p>
      )}
      <p className="mt-10 border-t pt-4 text-sm text-text-2">
        Questions? Email <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. 8Tasks is
        operated by {OPERATOR.legalName}, {OPERATOR.region}, {OPERATOR.country}.
      </p>
    </article>
  );
}
