import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { withPublicDb } from "@/db/client";
import { categories, discoveryGroups } from "@/db/schema";
import {
  DEFAULT_CATEGORY_TABS,
  DEFAULT_PATHWAYS,
  DEFAULT_SUBSECTIONS,
  type DiscoveryGroup,
} from "./defaults";

export type DiscoveryConfig = {
  pathways: DiscoveryGroup[];
  /** Curated tabs per category slug. Categories without tabs show one per subcategory. */
  tabs: Record<string, DiscoveryGroup[]>;
  subsections: DiscoveryGroup[];
};

function toConfig(groups: DiscoveryGroup[]): DiscoveryConfig {
  const tabs: Record<string, DiscoveryGroup[]> = {};
  for (const g of groups.filter((g) => g.kind === "category_tab" && g.categorySlug))
    (tabs[g.categorySlug!] ??= []).push(g);
  return {
    pathways: groups.filter((g) => g.kind === "pathway"),
    tabs,
    subsections: groups.filter((g) => g.kind === "subsection"),
  };
}

export const DEFAULT_CONFIG = toConfig([
  ...DEFAULT_PATHWAYS,
  ...DEFAULT_CATEGORY_TABS,
  ...DEFAULT_SUBSECTIONS,
]);

/**
 * Admin-managed discovery groups (pathways, category tabs, /earn subsections).
 * Falls back to the built-in defaults if the table is empty or unavailable, so the
 * public site never breaks because of configuration.
 */
export const getDiscoveryConfig = cache(async (): Promise<DiscoveryConfig> => {
  try {
    const rows = await withPublicDb((tx) =>
      tx
        .select({
          kind: discoveryGroups.kind,
          slug: discoveryGroups.slug,
          categorySlug: categories.slug,
          title: discoveryGroups.title,
          description: discoveryGroups.description,
          icon: discoveryGroups.icon,
          accent: discoveryGroups.accent,
          includes: discoveryGroups.includes,
          subcategorySlugs: discoveryGroups.subcategorySlugs,
          categorySlugs: discoveryGroups.categorySlugs,
          sortOrder: discoveryGroups.sortOrder,
        })
        .from(discoveryGroups)
        .leftJoin(categories, eq(categories.id, discoveryGroups.categoryId))
        .orderBy(asc(discoveryGroups.sortOrder), asc(discoveryGroups.title)),
    );
    if (!rows.length) return DEFAULT_CONFIG;
    return toConfig(
      rows.map((r) => ({
        ...r,
        categorySlug: r.categorySlug ?? undefined,
        description: r.description ?? undefined,
        icon: r.icon ?? undefined,
        accent: r.accent ?? undefined,
      })),
    );
  } catch (err) {
    console.error("discovery config unavailable, using defaults", err);
    return DEFAULT_CONFIG;
  }
});
