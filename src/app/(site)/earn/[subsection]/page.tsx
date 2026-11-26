import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingDisclosure } from "@/components/app/listing-disclosure";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { MissionGrid } from "@/components/app/mission-card";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { discoveryIcon } from "@/lib/discovery/icons";
import { applyDiscovery } from "@/lib/missions/filters";
import { loadOpportunities } from "@/lib/missions/source";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ subsection: string }> };

async function getSubsection(slug: string) {
  return (await getDiscoveryConfig()).subsections.find((s) => s.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).subsection;
  const s = await getSubsection(slug);
  return s
    ? { title: s.title, description: s.description, alternates: { canonical: `/earn/${slug}` } }
    : {};
}

/** Creative subsection landing pages: Capture, Write, Film, Review, Promote & Earn. */
export default async function EarnPage({ params }: Props) {
  const slug = (await params).subsection;
  const { subsections } = await getDiscoveryConfig();
  const s = subsections.find((x) => x.slug === slug);
  if (!s) notFound();
  const items = applyDiscovery(await loadOpportunities(), { group: s });
  const Icon = discoveryIcon(s.icon);
  const accent = s.accent ?? "#53E6A0";

  return (
    <Container className="flex flex-col gap-5 pt-5 sm:pt-8">
      <Link href="/missions" className="w-fit text-sm text-text-2 hover:text-foreground">
        ← Discover
      </Link>
      <header className="flex items-start gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
            {s.title}
          </h1>
          {s.description && <p className="text-text-2">{s.description}</p>}
        </div>
      </header>
      {s.includes.length > 0 && (
        <p className="text-sm text-text-2">Includes {s.includes.join(", ").toLowerCase()}.</p>
      )}
      {slug === "promote-earn" && (
        <p className="text-sm text-warning">
          Commission income depends on your results and ongoing effort. It is never guaranteed.
        </p>
      )}

      {items.length ? (
        <>
          <MissionGrid items={items} headingLevel={2} />
          <ListingDisclosure items={items} />
        </>
      ) : (
        <EmptyState
          title="Nothing listed here yet"
          description="We only list opportunities we've checked. New ones are added as providers are approved."
        >
          <Link
            href="/daily-8#signup"
            className="text-sm font-semibold text-emerald hover:underline"
          >
            Get free alerts
          </Link>
        </EmptyState>
      )}

      <nav aria-label="More ways to earn" className="flex flex-wrap gap-2 border-t pt-5">
        {subsections
          .filter((x) => x.slug !== s.slug)
          .map((x) => (
            <Link
              key={x.slug}
              href={`/earn/${x.slug}`}
              className="flex min-h-11 items-center rounded-full border bg-surface px-4 text-sm hover:border-emerald"
            >
              {x.title}
            </Link>
          ))}
      </nav>
    </Container>
  );
}
