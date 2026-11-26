import type { Metadata } from "next";
import Link from "next/link";
import { AdvancedFilters } from "@/components/app/advanced-filters";
import { AffiliateDisclosure } from "@/components/app/affiliate-disclosure";
import { Container } from "@/components/app/container";
import { EmptyState, NO_MATCHES } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { MissionGrid } from "@/components/app/mission-card";
import { PathwayGrid } from "@/components/app/pathway-grid";
import { SearchBar } from "@/components/app/search-bar";
import { applyDiscovery, availableFilters, FILTER_BY_ID, HOME_CHIPS } from "@/lib/missions/filters";
import { buildHref, param, params, type SearchParams } from "@/lib/missions/query";
import { loadOpportunities } from "@/lib/missions/source";
import { PATHWAY_BY_SLUG, PATHWAYS, type PathwaySlug } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const path = param(await searchParams, "path") as PathwaySlug | undefined;
  return { title: (path && PATHWAY_BY_SLUG[path]?.title) || "Discover missions" };
}

export default async function MissionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = param(sp, "q");
  const pathSlug = param(sp, "path") as PathwaySlug | undefined;
  const pathway = pathSlug ? PATHWAY_BY_SLUG[pathSlug] : undefined;
  const filters = params(sp, "f").filter((id) => FILTER_BY_ID[id] && id !== "for-you");

  const all = await loadOpportunities();
  const scoped = pathway ? applyDiscovery(all, { filters: [pathway.slug] }) : all;
  const available = availableFilters(scoped);
  const items = applyDiscovery(scoped, { q, filters });

  const base = { q, path: pathway?.slug };
  const chips = HOME_CHIPS.map((id) => {
    const isActive = id === "for-you" ? filters.length === 0 : filters.includes(id);
    const next =
      id === "for-you" ? [] : isActive ? filters.filter((x) => x !== id) : [...filters, id];
    return {
      id,
      label: FILTER_BY_ID[id].label,
      href: buildHref("/missions", { ...base, f: next }),
      active: isActive,
      disabled: !isActive && !available.has(id),
      disabledHint: FILTER_BY_ID[id].disabledHint,
    };
  });

  return (
    <Container className="flex flex-col gap-5 pt-5 sm:pt-8">
      <div className="flex flex-col gap-1">
        <Link href="/" className="w-fit text-sm text-text-2 hover:text-foreground">
          ← Discover
        </Link>
        {pathway ? (
          <div className="mt-1 flex items-start gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: `${pathway.accent}1f`, color: pathway.accent }}
            >
              <pathway.icon className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
                {pathway.title}
              </h1>
              <p className="text-text-2">
                {pathway.description} Includes{" "}
                {pathway.includes.slice(0, 5).join(", ").toLowerCase()} and more.
              </p>
              {pathway.slug === "recurring-income" && (
                <p className="mt-1 text-sm text-warning">
                  Commission income depends on your results and ongoing effort. It is never
                  guaranteed.
                </p>
              )}
            </div>
          </div>
        ) : (
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
            {q ? `Results for “${q}”` : "Discover missions"}
          </h1>
        )}
      </div>

      <SearchBar
        defaultValue={q}
        filtersHref={buildHref("/missions", { ...base, f: filters, panel: "1" }, "filters")}
      />

      {!pathway && (
        <section aria-label="Ways to earn">
          <PathwayGrid pathways={PATHWAYS} />
        </section>
      )}

      <FilterChips chips={chips} label="Quick filters" />
      <AdvancedFilters
        action="/missions"
        active={filters}
        available={available}
        hidden={{ q, path: pathway?.slug }}
        open={param(sp, "panel") === "1"}
      />

      <p className="text-sm text-text-2" role="status">
        {items.length} {items.length === 1 ? "listing" : "listings"}
      </p>
      {items.length ? (
        <>
          <MissionGrid items={items} headingLevel={2} />
          <AffiliateDisclosure />
        </>
      ) : (
        <EmptyState title={NO_MATCHES}>
          <Link href="/missions" className="text-sm font-semibold text-emerald hover:underline">
            Clear search and filters
          </Link>
        </EmptyState>
      )}
    </Container>
  );
}
