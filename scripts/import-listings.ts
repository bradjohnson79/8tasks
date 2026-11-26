/**
 * Imports the founder's listings package (or any provider import file) in one transaction.
 *   npm run listings:import -- --file <path> [--include-free-drafts] [--dry-run] [--publish-affiliate]
 *  --include-free-drafts  also import free_listing_candidates[] (always as drafts)
 *  --dry-run              run everything, print the counts, then roll back
 *  --publish-affiliate    publish affiliate rows marked "published" even if they already exist
 *                         (founder go-ahead only; the publish policy still applies)
 * Connects with ADMIN_DATABASE_URL (least privilege; app_admin can write everything needed).
 * Never import listings_pending_review.csv.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { applyProviders, importLookups } from "../src/lib/import/apply";
import { parseImport } from "../src/lib/import/provider-import";

config({ path: ".env.local", quiet: true });

class DryRun extends Error {}

async function main() {
  const args = process.argv.slice(2);
  const file = args[args.indexOf("--file") + 1];
  if (!args.includes("--file") || !file)
    throw new Error(
      "Usage: npm run listings:import -- --file <path> [--include-free-drafts] [--dry-run] [--publish-affiliate]",
    );
  if (/pending_review/i.test(file))
    throw new Error("listings_pending_review.csv is never imported.");
  const dryRun = args.includes("--dry-run");
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) throw new Error("ADMIN_DATABASE_URL is not set");
  const parsed = parseImport(readFileSync(file, "utf8"), file.endsWith(".csv") ? "csv" : "json", {
    includeFree: args.includes("--include-free-drafts"),
  });
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  let counts;
  try {
    await db.transaction(async (tx) => {
      const l = await importLookups(tx, parsed.providers);
      if (l.errors.length) throw new Error(l.errors.join("\n"));
      counts = await applyProviders(tx, parsed.providers, l, null, {
        publishAffiliate: args.includes("--publish-affiliate"),
      });
      if (dryRun) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  } finally {
    await pool.end();
  }
  console.log(
    `${dryRun ? "DRY RUN (rolled back)" : "Imported"}: ${JSON.stringify(counts, null, 2)}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
