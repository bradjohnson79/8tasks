import Link from "next/link";
import { ArrowRight, Compass, Handshake, HandCoins, UserPlus } from "lucide-react";
import { CategoryGrid } from "@/components/app/category-grid";
import { Container, SectionHeader } from "@/components/app/container";
import { Daily8Card } from "@/components/app/daily8-card";
import { EmptyState, NO_MATCHES } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { HeroIllustration } from "@/components/app/hero-illustration";
import { MissionGrid } from "@/components/app/mission-card";
import { PathwayGrid } from "@/components/app/pathway-grid";
import { SearchBar } from "@/components/app/search-bar";
import { getActiveCategories } from "@/db/queries/public";
import { applyDiscovery, availableFilters, FILTER_BY_ID, HOME_CHIPS } from "@/lib/missions/filters";
import { buildHref, param, type SearchParams } from "@/lib/missions/query";
import { loadOpportunities } from "@/lib/missions/source";
import { getDiscoveryConfig } from "@/lib/discovery/config";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const FEED_LIMIT = 6;

const STEPS = [
  {
    icon: Compass,
    title: "Discover",
    body: "Browse missions and providers by category or by how you want to earn.",
  },
  {
    icon: UserPlus,
    title: "Join the provider",
    body: "We send you to the provider's own site to sign up and complete tasks.",
  },
  {
    icon: HandCoins,
    title: "Get paid by them",
    body: "Providers verify your work and pay you directly under their terms.",
  },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const requested = param(sp, "f");
  const [categories, all, config] = await Promise.all([
    getActiveCategories(),
    loadOpportunities(),
    getDiscoveryConfig(),
  ]);
  const available = availableFilters(all);
  const active =
    requested && HOME_CHIPS.includes(requested) && available.has(requested) ? requested : "for-you";
  const feed = applyDiscovery(all, { filters: active === "for-you" ? [] : [active] });

  const chips = HOME_CHIPS.map((id) => ({
    id,
    label: FILTER_BY_ID[id].label,
    href: buildHref("/", { f: id === "for-you" ? undefined : id }, "discover"),
    active: id === active,
    disabled: !available.has(id),
    disabledHint: FILTER_BY_ID[id].disabledHint,
  }));

  return (
    <Container className="flex flex-col gap-8 pt-5 sm:pt-8">
      {/* Discovery headline, tagline, search (design spec §8, update §3) */}
      <section
        aria-labelledby="hero-title"
        className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h1
              id="hero-title"
              className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px] lg:text-[40px]"
            >
              Your next mission awaits.
            </h1>
            <p className="mt-1 text-base font-semibold text-emerald sm:text-lg">
              Small Missions. Real Money.
            </p>
            <p className="mt-2 max-w-2xl text-[15px] text-text-2">
              Discover legitimate opportunities to earn extra money through simple tasks, testing,
              research and more.
            </p>
          </div>
          <SearchBar />
          <Daily8Card />
        </div>
        {/* Founder-approved exception: the site's only graphic. Wide screens only, so
            search and Daily 8 stay near the top on phones. */}
        <div className="hidden lg:block">
          <HeroIllustration />
        </div>
      </section>

      {/* How do you want to earn? (update §4) */}
      <section aria-labelledby="pathways-title">
        <SectionHeader id="pathways-title" title="How do you want to earn?" />
        <PathwayGrid pathways={config.pathways} />
      </section>

      {/* Eight categories */}
      <section aria-labelledby="categories-title">
        <SectionHeader id="categories-title" title="Categories" />
        <CategoryGrid categories={categories} />
      </section>

      {/* Discover missions feed */}
      <section aria-labelledby="discover-title" id="discover" className="scroll-mt-20">
        <SectionHeader
          id="discover-title"
          title="Discover missions"
          action={
            <Link
              href={buildHref("/missions", { f: active === "for-you" ? undefined : active })}
              className="shrink-0 rounded-md text-sm font-semibold text-emerald hover:underline"
            >
              View all
            </Link>
          }
        />
        <div className="mb-4">
          <FilterChips chips={chips} label="Mission filters" />
        </div>
        {feed.length ? (
          <MissionGrid items={feed.slice(0, FEED_LIMIT)} />
        ) : (
          <EmptyState title={NO_MATCHES}>
            <Link
              href="/#categories-title"
              className="text-sm font-semibold text-emerald hover:underline"
            >
              Browse categories
            </Link>
          </EmptyState>
        )}
        {feed.length > FEED_LIMIT && (
          <Link
            href={buildHref("/missions", { f: active === "for-you" ? undefined : active })}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border bg-surface text-sm font-semibold hover:border-emerald/40"
          >
            View all {feed.length} listings <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </section>

      {/* How 8Tasks works */}
      <section aria-labelledby="how-title">
        <SectionHeader
          id="how-title"
          title="How 8Tasks works"
          description="We help you find providers. They give you the work and pay you."
        />
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border bg-surface p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-action text-action-foreground">
                <s.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-0.5 text-sm text-text-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Creator Partner Program (separate from "Create & Earn" content opportunities, update §13) */}
      <section aria-labelledby="partner-title" className="rounded-2xl border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated text-[#B5A0F5]">
            <Handshake className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="partner-title" className="text-lg font-semibold">
              Creator Partner Program
            </h2>
            <p className="mt-0.5 text-sm text-text-2">
              Coming soon for approved creators who introduce their audience to 8Tasks itself. This
              is separate from the Create &amp; Earn opportunities above, where companies pay you
              for content.
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full bg-elevated px-3 py-1 text-xs font-semibold">
            Coming soon
          </span>
        </div>
      </section>
    </Container>
  );
}
