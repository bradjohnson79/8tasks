/**
 * Prints idempotent SQL that seeds the new subcategories and default discovery groups.
 * Used to build drizzle/0005_discovery_rls.sql (and to re-seed an environment by hand).
 *   npx tsx scripts/gen-discovery-sql.ts
 */
import { DEFAULT_GROUPS } from "../src/lib/discovery/defaults";
import { CATEGORY_SEED } from "./seed-data";

const q = (s: string | undefined | null) => (s == null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `ARRAY[${a.map(q).join(",")}]::text[]`;

const out: string[] = [];
for (const c of CATEGORY_SEED) {
  c.subcategories.forEach((s, i) => {
    out.push(
      `INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, ${q(s.slug)}, ${q(s.name)}, ${i} FROM categories WHERE slug = ${q(c.slug)} ON CONFLICT (category_id, slug) DO NOTHING;`,
    );
  });
}
for (const g of DEFAULT_GROUPS) {
  const cat = g.categorySlug
    ? `(SELECT id FROM categories WHERE slug = ${q(g.categorySlug)})`
    : "NULL";
  out.push(
    `INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES (${q(g.kind)}, ${q(g.slug)}, ${cat}, ${q(g.title)}, ${q(g.description)}, ${q(g.icon)}, ${q(g.accent)}, ${arr(g.includes)}, ${arr(g.subcategorySlugs)}, ${arr(g.categorySlugs)}, ${g.sortOrder}) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;`,
  );
}
console.log(out.join("\n--> statement-breakpoint\n"));
