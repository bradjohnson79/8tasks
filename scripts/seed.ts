/**
 * Seeds the 8 mission categories (safe everywhere) and, outside production,
 * clearly flagged demo providers/opportunities (is_demo = true).
 *
 *   npm run db:seed            # categories + demo data (local / preview only)
 *   npm run db:seed -- --categories-only
 *
 * Runs as the schema owner (MIGRATION_DATABASE_URL). Idempotent: upserts by slug.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { CATEGORY_SEED, DEMO_PROVIDERS } from "./seed-data";

config({ path: ".env.local" });

const categoriesOnly = process.argv.includes("--categories-only");
const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.SEED_TARGET === "production";

async function main() {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set");
  if (isProduction && !categoriesOnly) {
    throw new Error(
      "Refusing to seed demo data into production. Use --categories-only.",
    );
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: "snake_case" });

  await db.transaction(async (tx) => {
    for (const c of CATEGORY_SEED) {
      const [cat] = await tx
        .insert(schema.categories)
        .values({
          slug: c.slug,
          name: c.name,
          description: c.description,
          icon: c.icon,
          sortOrder: c.sortOrder,
        })
        .onConflictDoUpdate({
          target: schema.categories.slug,
          set: {
            name: c.name,
            description: c.description,
            icon: c.icon,
            sortOrder: c.sortOrder,
          },
        })
        .returning({ id: schema.categories.id });

      for (const [i, s] of c.subcategories.entries()) {
        await tx
          .insert(schema.subcategories)
          .values({
            categoryId: cat.id,
            slug: s.slug,
            name: s.name,
            sortOrder: i,
          })
          .onConflictDoUpdate({
            target: [
              schema.subcategories.categoryId,
              schema.subcategories.slug,
            ],
            set: { name: s.name, sortOrder: i },
          });
      }
    }
    console.log(`Seeded ${CATEGORY_SEED.length} categories.`);

    if (categoriesOnly) return;

    const cats = await tx
      .select({ id: schema.categories.id, slug: schema.categories.slug })
      .from(schema.categories);
    const catId = (slug: string) => {
      const found = cats.find((c) => c.slug === slug);
      if (!found) throw new Error(`Unknown category ${slug}`);
      return found.id;
    };

    for (const p of DEMO_PROVIDERS) {
      const [provider] = await tx
        .insert(schema.providers)
        .values({ ...p.provider, isDemo: true, status: "published" })
        .onConflictDoUpdate({
          target: schema.providers.slug,
          set: { ...p.provider, isDemo: true },
        })
        .returning({ id: schema.providers.id });

      // One demo link per provider; replace on re-seed.
      const existing = await tx.execute(
        sql`select id from affiliate_links where provider_id = ${provider.id} and is_demo limit 1`,
      );
      let linkId = existing.rows[0]?.id as string | undefined;
      if (!linkId) {
        const [link] = await tx
          .insert(schema.affiliateLinks)
          .values({
            providerId: provider.id,
            label: "Demo link",
            destinationUrl: p.linkUrl,
            isDemo: true,
          })
          .returning({ id: schema.affiliateLinks.id });
        linkId = link.id;
      }

      for (const o of p.opportunities) {
        await tx
          .insert(schema.opportunities)
          .values({
            providerId: provider.id,
            categoryId: catId(o.category),
            affiliateLinkId: linkId,
            slug: o.slug,
            title: o.title,
            summary: o.summary,
            countries: p.provider.countries,
            status: "published",
            isDemo: true,
          })
          .onConflictDoUpdate({
            target: [
              schema.opportunities.providerId,
              schema.opportunities.slug,
            ],
            set: {
              title: o.title,
              summary: o.summary,
              categoryId: catId(o.category),
              isDemo: true,
            },
          });
      }
    }
    console.log(
      `Seeded ${DEMO_PROVIDERS.length} DEMO providers (is_demo = true).`,
    );
  });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
