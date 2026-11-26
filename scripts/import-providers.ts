/**
 * Imports a provider package (JSON or CSV) the same way /admin/import does (new records as drafts).
 *   npm run import:providers -- data/import/claude_integration_package.json
 * Runs as the admin role (ADMIN_DATABASE_URL). Never changes an existing status.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { applyProviders, importLookups } from "../src/lib/import/apply";
import { parseImport } from "../src/lib/import/provider-import";

config({ path: ".env.local", quiet: true });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run import:providers -- <file.json|file.csv>");
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) throw new Error("ADMIN_DATABASE_URL is not set");
  const parsed = parseImport(readFileSync(file, "utf8"), file.endsWith(".csv") ? "csv" : "json");
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  const result = await db.transaction(async (tx) => {
    const l = await importLookups(tx, parsed.providers);
    if (l.errors.length) throw new Error(l.errors.join("\n"));
    return applyProviders(tx, parsed.providers, l, null);
  });
  console.log(`Imported as drafts: ${JSON.stringify(result)}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
