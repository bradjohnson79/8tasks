import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cardMetadata, formatVerified } from "@/lib/missions/metadata";
import type { Opportunity } from "@/lib/missions/types";
import { categoryDisplay } from "@/lib/taxonomy";
import { BookmarkButton } from "./bookmark-button";
import { CompensationDisplay } from "./compensation-display";
import { MissionMetadata } from "./mission-metadata";
import { INDEPENDENT_LABEL } from "./listing-disclosure";
import { StatusPill } from "./status-pill";

/**
 * The central reusable card (design spec §14–15, update §9–11, §15). Same component on
 * every screen size. Provider-level listings say so and never imply a guaranteed assignment.
 */
export function MissionCard({
  opportunity: o,
  headingLevel = 3,
}: {
  opportunity: Opportunity;
  headingLevel?: 2 | 3;
}) {
  const d = categoryDisplay(o.categorySlug);
  const Icon = d.icon;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/missions/${o.id}`;
  const cta = o.kind === "provider" ? "Explore Opportunity" : "Explore Mission";
  const pills = o.isDemo || o.isSponsored || o.isFeatured || o.isFreeListing;

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border bg-surface p-4 transition-colors hover:border-elevated">
      <div className="flex items-start gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated"
          style={{ color: d.accent }}
          aria-hidden
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-text-2">
            {o.kind === "provider" ? `${o.categoryName} · Provider` : o.categoryName}
          </p>
          <Heading className="mt-0.5 text-base font-semibold leading-snug">
            <Link href={href} className="hover:text-emerald focus-visible:text-emerald">
              {o.title}
            </Link>
          </Heading>
          <p className="mt-0.5 truncate text-[13px] text-text-2">{o.providerName}</p>
        </div>
        <div className="flex max-w-[42%] shrink-0 flex-col items-end gap-1">
          <CompensationDisplay compensation={o.compensation} />
        </div>
      </div>

      <MissionMetadata items={cardMetadata(o)} />
      {o.lastVerifiedAt && (
        <p className="-mt-2 text-xs text-text-2">{formatVerified(o.lastVerifiedAt)}</p>
      )}

      <div className="mt-auto flex items-center gap-2">
        {pills && (
          <div className="flex shrink-0 flex-col gap-1">
            {o.isDemo && <StatusPill tone="warning">Demo</StatusPill>}
            {o.isFeatured && <StatusPill tone="success">Editor&apos;s pick</StatusPill>}
            {o.isSponsored && <StatusPill tone="info">Sponsored</StatusPill>}
            {o.isFreeListing && <StatusPill>{INDEPENDENT_LABEL}</StatusPill>}
          </div>
        )}
        <Link
          href={href}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground transition-colors hover:bg-action/80 active:scale-[0.99]"
        >
          {cta}
          <ArrowRight className="size-4" aria-hidden />
          <span className="sr-only">: {o.title}</span>
        </Link>
        <BookmarkButton id={o.id} title={o.title} />
      </div>
    </article>
  );
}

export function MissionGrid({
  items,
  headingLevel,
}: {
  items: Opportunity[];
  headingLevel?: 2 | 3;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((o) => (
        <li key={o.id}>
          <MissionCard opportunity={o} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
