import "server-only";
import { asc, eq } from "drizzle-orm";
import type { adminDbUnsafe } from "../client";
import {
  affiliateLinks,
  categories,
  discoveryGroups,
  opportunityCategories,
  opportunityGroups,
  providers,
  subcategories,
} from "../schema";

type AdminDb = ReturnType<typeof adminDbUnsafe>;

/** Select options for the opportunity form. */
export async function getOpportunityFormOptions(db: AdminDb) {
  const [provs, cats, subs, links, groups] = await Promise.all([
    db
      .select({ id: providers.id, name: providers.name })
      .from(providers)
      .orderBy(asc(providers.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        category: categories.name,
        categoryId: categories.id,
      })
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
    db
      .select({ id: discoveryGroups.id, kind: discoveryGroups.kind, title: discoveryGroups.title })
      .from(discoveryGroups)
      .orderBy(asc(discoveryGroups.kind), asc(discoveryGroups.sortOrder)),
  ]);
  return {
    providers: provs.map((p) => ({ value: p.id, label: p.name })),
    categories: cats.map((c) => ({ value: c.id, label: c.name })),
    subcategories: subs.map((s) => ({ value: s.id, label: `${s.category} › ${s.name}` })),
    /** Secondary category choices: whole categories, then each subcategory. */
    secondary: [
      ...cats.map((c) => ({ value: `${c.id}|`, label: `${c.name} (whole category)` })),
      ...subs.map((s) => ({
        value: `${s.categoryId}|${s.id}`,
        label: `${s.category} › ${s.name}`,
      })),
    ],
    /** Explicit memberships: /earn subsections and pathways (tabs follow subcategories). */
    groups: groups
      .filter((g) => g.kind !== "category_tab")
      .map((g) => ({
        value: g.id,
        label: `${g.kind === "subsection" ? "Subsection" : "Pathway"}: ${g.title}`,
      })),
    links: links.map((l) => ({
      value: l.id,
      label: `${l.provider} — ${l.label}${l.isActive ? "" : " (inactive)"}`,
    })),
  };
}

/** Current secondary categories and group memberships of one opportunity (form defaults). */
export async function getOpportunityMemberships(db: AdminDb, opportunityId: string) {
  const [secondary, groups] = await Promise.all([
    db
      .select({
        categoryId: opportunityCategories.categoryId,
        subcategoryId: opportunityCategories.subcategoryId,
      })
      .from(opportunityCategories)
      .where(eq(opportunityCategories.opportunityId, opportunityId)),
    db
      .select({ groupId: opportunityGroups.groupId })
      .from(opportunityGroups)
      .where(eq(opportunityGroups.opportunityId, opportunityId)),
  ]);
  return {
    secondary: secondary.map((s) => `${s.categoryId}|${s.subcategoryId ?? ""}`),
    groups: groups.map((g) => g.groupId),
  };
}
