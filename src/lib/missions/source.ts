import "server-only";
import { cache } from "react";
import { getPublicOpportunityRows } from "@/db/queries/public";
import { shouldShowDemoData } from "@/lib/demo";
import { getDemoOpportunities } from "./demo-data";
import type { Opportunity } from "./types";

/**
 * The discovery feed: real published listings from the database, plus the isolated
 * demo dataset when (and only when) demo data is allowed. In production the demo
 * dataset is never loaded (shouldShowDemoData() is false when VERCEL_ENV=production).
 *
 * Database listings don't yet store compensation, duration or attributes (planned
 * columns are documented in docs/DATABASE.md), so they render as provider-level cards
 * with "See provider details" and no unverified metadata.
 */
export const loadOpportunities = cache(async (): Promise<Opportunity[]> => {
  const showDemo = shouldShowDemoData();
  const rows = await getPublicOpportunityRows();
  const real: Opportunity[] = rows
    // Older seeded demo rows are superseded by the richer demo dataset below.
    .filter((r) => !r.isDemo)
    .map((r) => ({
      id: r.id,
      kind: r.dataSource === "provider_level" ? "provider" : "mission",
      title: r.title,
      summary: r.summary ?? undefined,
      description: r.description ?? undefined,
      categorySlug: r.categorySlug,
      categoryName: r.categoryName,
      subcategorySlug: r.subcategorySlug ?? undefined,
      providerName: r.providerName,
      providerSlug: r.providerSlug,
      compensation: { type: "unknown" },
      countries: r.countries,
      attributes: {},
      isSponsored: r.isSponsored,
      isDemo: false,
      createdAt: r.createdAt.toISOString(),
      hasOutboundLink: r.hasLink,
    }));
  return showDemo ? [...real, ...getDemoOpportunities()] : real;
});

export async function loadOpportunity(id: string): Promise<Opportunity | undefined> {
  return (await loadOpportunities()).find((o) => o.id === id);
}
