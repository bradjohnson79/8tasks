import type { Opportunity } from "@/lib/missions/types";
import type { DiscoveryGroup } from "./defaults";

/** Primary + secondary category slugs of a listing (one record, many categories). */
export function categoriesOf(o: Opportunity): string[] {
  return [o.categorySlug, ...(o.secondary ?? []).map((s) => s.categorySlug)];
}

/** Primary + secondary subcategory slugs of a listing. */
export function subcategoriesOf(o: Opportunity): string[] {
  const out: string[] = [];
  if (o.subcategorySlug) out.push(o.subcategorySlug);
  for (const s of o.secondary ?? []) if (s.subcategorySlug) out.push(s.subcategorySlug);
  return out;
}

export function inCategory(o: Opportunity, slug: string): boolean {
  return categoriesOf(o).includes(slug);
}

/**
 * A listing belongs to a group when an admin linked it explicitly, or when one of its
 * categories/subcategories (primary or secondary) is in the group's definition.
 * Category tabs only match subcategories within their own category.
 */
export function belongsTo(o: Opportunity, g: DiscoveryGroup): boolean {
  if (o.groupKeys?.includes(`${g.kind}:${g.slug}`)) return true;
  if (g.kind === "category_tab") {
    const pairs = [
      { c: o.categorySlug, s: o.subcategorySlug },
      ...(o.secondary ?? []).map((x) => ({ c: x.categorySlug, s: x.subcategorySlug })),
    ];
    return pairs.some((p) => p.c === g.categorySlug && !!p.s && g.subcategorySlugs.includes(p.s));
  }
  const cats = categoriesOf(o);
  if (g.categorySlugs.some((c) => cats.includes(c))) return true;
  const subs = subcategoriesOf(o);
  return g.subcategorySlugs.some((s) => subs.includes(s));
}
