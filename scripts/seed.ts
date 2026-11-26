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
import {
  CATEGORY_SEED,
  DEMO_PROVIDERS,
  MOVED_SUBCATEGORIES,
  RETIRED_CATEGORIES,
} from "./seed-data";
import { AFFILIATE_PROGRAM_SEED } from "./affiliate-programs-data";

config({ path: ".env.local" });

const categoriesOnly = process.argv.includes("--categories-only");
const isProduction =
  process.env.VERCEL_ENV === "production" || process.env.SEED_TARGET === "production";

async function main() {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set");
  if (isProduction && !categoriesOnly) {
    throw new Error("Refusing to seed demo data into production. Use --categories-only.");
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
            target: [schema.subcategories.categoryId, schema.subcategories.slug],
            set: { name: s.name, sortOrder: i },
          });
      }
    }
    console.log(`Seeded ${CATEGORY_SEED.length} categories.`);

    // Merge retired categories into their replacement (idempotent).
    for (const [oldSlug, newSlug] of Object.entries(RETIRED_CATEGORIES)) {
      await tx.execute(sql`
        with old as (select id from categories where slug = ${oldSlug}),
             tgt as (select id from categories where slug = ${newSlug}),
             dup as (
               select os.id as old_sub, ts.id as new_sub
               from subcategories os join old on os.category_id = old.id
               join subcategories ts on ts.category_id = (select id from tgt) and ts.slug = os.slug
             ),
             moved_opps as (
               update opportunities o set subcategory_id = dup.new_sub from dup where o.subcategory_id = dup.old_sub
               returning o.id
             )
        delete from subcategories s using dup where s.id = dup.old_sub`);
      await tx.execute(sql`
        update subcategories set category_id = (select id from categories where slug = ${newSlug})
        where category_id = (select id from categories where slug = ${oldSlug})`);
      await tx.execute(sql`
        update opportunities set category_id = (select id from categories where slug = ${newSlug})
        where category_id = (select id from categories where slug = ${oldSlug})`);
      const res = await tx.execute(sql`delete from categories where slug = ${oldSlug}`);
      if (res.rowCount) console.log(`Merged category ${oldSlug} into ${newSlug}.`);
    }

    // Subcategories that moved to another category: repoint opportunities to the
    // target's copy (seeded above), then drop the old one (idempotent).
    for (const m of MOVED_SUBCATEGORIES) {
      await tx.execute(sql`
        update opportunities o set subcategory_id = t.id, category_id = t.category_id
        from subcategories f, subcategories t
        where o.subcategory_id = f.id
          and f.slug = ${m.slug} and f.category_id = (select id from categories where slug = ${m.from})
          and t.slug = ${m.slug} and t.category_id = (select id from categories where slug = ${m.to})`);
      const res = await tx.execute(sql`
        delete from subcategories
        where slug = ${m.slug} and category_id = (select id from categories where slug = ${m.from})`);
      if (res.rowCount) console.log(`Moved subcategory ${m.slug} from ${m.from} to ${m.to}.`);
    }

    // Affiliate program registry (real data; insert-only so admin edits survive).
    let added = 0;
    for (const p of AFFILIATE_PROGRAM_SEED) {
      const res = await tx
        .insert(schema.affiliatePrograms)
        .values(p)
        .onConflictDoNothing({ target: schema.affiliatePrograms.id });
      added += res.rowCount ?? 0;
    }
    console.log(
      `Affiliate programs: ${added} added, ${AFFILIATE_PROGRAM_SEED.length - added} already present.`,
    );

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
            target: [schema.opportunities.providerId, schema.opportunities.slug],
            set: {
              title: o.title,
              summary: o.summary,
              categoryId: catId(o.category),
              isDemo: true,
            },
          });
      }
    }
    console.log(`Seeded ${DEMO_PROVIDERS.length} DEMO providers (is_demo = true).`);
  });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
