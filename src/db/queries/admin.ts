import "server-only";
import { asc, eq } from "drizzle-orm";
import type { adminDbUnsafe } from "../client";
import { affiliateLinks, categories, providers, subcategories } from "../schema";

type AdminDb = ReturnType<typeof adminDbUnsafe>;

/** Select options for the opportunity form. */
export async function getOpportunityFormOptions(db: AdminDb) {
  const [provs, cats, subs, links] = await Promise.all([
    db
      .select({ id: providers.id, name: providers.name })
      .from(providers)
      .orderBy(asc(providers.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db
      .select({ id: subcategories.id, name: subcategories.name, category: categories.name })
      .from(subcategories)
      .innerJoin(categories, eq(categories.id, subcategories.categoryId))
      .orderBy(asc(categories.sortOrder), asc(subcategories.sortOrder)),
    db
      .select({
        id: affiliateLinks.id,
        label: affiliateLinks.label,
        provider: providers.name,
        isActive: affiliateLinks.isActive,
      })
      .from(affiliateLinks)
      .innerJoin(providers, eq(providers.id, affiliateLinks.providerId))
      .orderBy(asc(providers.name), asc(affiliateLinks.label)),
  ]);
  return {
    providers: provs.map((p) => ({ value: p.id, label: p.name })),
    categories: cats.map((c) => ({ value: c.id, label: c.name })),
    subcategories: subs.map((s) => ({ value: s.id, label: `${s.category} › ${s.name}` })),
    links: links.map((l) => ({
      value: l.id,
      label: `${l.provider} — ${l.label}${l.isActive ? "" : " (inactive)"}`,
    })),
  };
}
