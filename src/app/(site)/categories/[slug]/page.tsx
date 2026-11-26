import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "@/components/app/affiliate-disclosure";
import { Container } from "@/components/app/container";
import { EmptyState, NO_MATCHES } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { LocationPicker } from "@/components/app/location-picker";
import { MissionGrid } from "@/components/app/mission-card";
import { SubsectionLinks } from "@/components/app/subsection-links";
import { getActiveCategories, getSubcategories } from "@/db/queries/public";
import { applyDiscovery } from "@/lib/missions/filters";
import { describeLocation, inArea, parseLocation } from "@/lib/missions/location";
import { buildHref, param, type SearchParams } from "@/lib/missions/query";
import { loadOpportunities } from "@/lib/missions/source";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import type { DiscoveryGroup } from "@/lib/discovery/defaults";
import { categoryDisplay, LOCATION_CATEGORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function getCategory(slug: string) {
  return (await getActiveCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return c
    ? {
        title: c.name,
        description: c.description ?? undefined,
        alternates: { canonical: `/categories/${c.slug}` },
      }
    : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  // Tabs: curated groups where configured (admin: /admin/discovery), otherwise one per subcategory.
  const config = await getDiscoveryConfig();
  const tabs: DiscoveryGroup[] =
    config.tabs[slug] ??
    (await getSubcategories(slug)).map((s, i) => ({
      kind: "category_tab" as const,
      slug: s.slug,
      categorySlug: slug,
      title: s.name,
      includes: [],
      subcategorySlugs: [s.slug],
      categorySlugs: [],
      sortOrder: i,
    }));
  const subSlugs = (await getSubcategories(slug)).map((s) => s.slug);
  const relatedSubsections = config.subsections.filter(
    (g) => g.categorySlugs.includes(slug) || g.subcategorySlugs.some((s) => subSlugs.includes(s)),
  );
  const tab = tabs.find((t) => t.slug === param(sp, "tab"));
  const showLocation = LOCATION_CATEGORIES.includes(slug);
  const loc = showLocation
    ? parseLocation(param(sp, "country"), param(sp, "region"), param(sp, "city"))
    : undefined;

  let items = applyDiscovery(await loadOpportunities(), {
    category: slug,
    group: tab,
  });
  if (loc) items = items.filter((o) => inArea(o, loc));

  const keep = { country: loc?.country, region: loc?.region, city: loc?.city };
  const chips = [
    { id: "all", label: "All", href: buildHref(`/categories/${slug}`, keep), active: !tab },
    ...tabs.map((t) => ({
      id: t.slug,
      label: t.title,
      href: buildHref(`/categories/${slug}`, { ...keep, tab: t.slug }),
      active: tab?.slug === t.slug,
    })),
  ];
  const d = categoryDisplay(slug);
  const Icon = d.icon;

  return (
    <Container className="flex flex-col gap-5 pt-5 sm:pt-8">
      <Link href="/" className="w-fit text-sm text-text-2 hover:text-foreground">
        ← Discover
      </Link>
      <header className="flex items-start gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface"
          style={{ color: d.accent }}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
            {category.name}
          </h1>
          {category.description && <p className="text-text-2">{category.description}</p>}
        </div>
      </header>

      {showLocation && (
        <LocationPicker action={`/categories/${slug}`} value={keep} hidden={{ tab: tab?.slug }} />
      )}
      {tabs.length > 0 && <FilterChips chips={chips} label={`${category.name} types`} />}
      <SubsectionLinks subsections={relatedSubsections} />

      {loc && (
        <p className="text-sm text-text-2" role="status">
          Showing missions in {describeLocation(loc)} and providers that operate there.{" "}
          <Link
            href={buildHref(`/categories/${slug}`, { tab: tab?.slug })}
            className="font-medium text-emerald hover:underline"
          >
            Clear location
          </Link>
        </p>
      )}

      {items.length ? (
        <>
          <MissionGrid items={items} headingLevel={2} />
          <AffiliateDisclosure />
        </>
      ) : (
        <EmptyState
          title={NO_MATCHES}
          description={
            loc ? "We only list missions that providers have confirmed for an area." : undefined
          }
        >
          <Link href="/missions" className="text-sm font-semibold text-emerald hover:underline">
            See all missions
          </Link>
        </EmptyState>
      )}
    </Container>
  );
}
