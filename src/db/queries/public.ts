import "server-only";
import { asc, count, eq, sql } from "drizzle-orm";
import { withPublicDb } from "../client";
import { categories, opportunities, providers } from "../schema";

/** Active categories with the number of published opportunities (RLS-filtered). */
export async function getActiveCategories() {
  return withPublicDb((tx) =>
    tx
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
        icon: categories.icon,
        opportunityCount: count(opportunities.id),
      })
      .from(categories)
      .leftJoin(opportunities, eq(opportunities.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  );
}

/** Published providers. Never selects admin-only columns (blocked by column grants anyway). */
export async function getPublishedProviders() {
  return withPublicDb((tx) =>
    tx
      .select({
        id: providers.id,
        slug: providers.slug,
        name: providers.name,
        summary: providers.summary,
        countries: providers.countries,
        isDemo: providers.isDemo,
      })
      .from(providers)
      .orderBy(asc(providers.name)),
  );
}

export async function getCategoryWithOpportunities(slug: string) {
  return withPublicDb(async (tx) => {
    const [category] = await tx
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
        icon: categories.icon,
      })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (!category) return null;

    const items = await tx
      .select({
        id: opportunities.id,
        title: opportunities.title,
        summary: opportunities.summary,
        countries: opportunities.countries,
        isSponsored: opportunities.isSponsored,
        isDemo: opportunities.isDemo,
        hasLink: sql<boolean>`${opportunities.affiliateLinkId} is not null`,
        providerName: providers.name,
        providerSlug: providers.slug,
      })
      .from(opportunities)
      .innerJoin(providers, eq(providers.id, opportunities.providerId))
      .where(eq(opportunities.categoryId, category.id))
      .orderBy(asc(opportunities.sortOrder), asc(opportunities.title));

    return { category, items };
  });
}

/** Looks up the affiliate link id for an opportunity, then resolves + logs via the DB function. */
export async function resolveOpportunityRedirect(
  opportunityId: string,
  meta: {
    sourcePath: string | null;
    country: string | null;
    deviceType: string;
    isBot: boolean;
  },
) {
  return withPublicDb(async (tx) => {
    const [opp] = await tx
      .select({ linkId: opportunities.affiliateLinkId })
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .limit(1);
    if (!opp?.linkId) return null;
    const res = await tx.execute<{ url: string | null }>(
      sql`select resolve_outbound_link(${opp.linkId}::uuid, ${opportunityId}::uuid, ${meta.sourcePath}, ${meta.country}, ${meta.deviceType}, ${meta.isBot}) as url`,
    );
    return res.rows[0]?.url ?? null;
  });
}
