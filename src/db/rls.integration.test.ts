/**
 * Database integration tests (master prompt §8): RLS hides internal data from the public
 * role, public intake is insert-only, and imports always land as drafts.
 * Runs against the LOCAL database from .env.local; skipped when it isn't configured.
 * Everything runs inside transactions that are rolled back.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { applyProviders, importLookups } from "@/lib/import/apply";
import { parseImport } from "@/lib/import/provider-import";
import * as schema from "./schema";

config({ path: ".env.local", quiet: true });
const runtimeUrl = process.env.DATABASE_URL;
const adminUrl = process.env.ADMIN_DATABASE_URL;
const isLocal = (u?: string) => !!u && /@(localhost|127\.0\.0\.1)[:/]/.test(u);
const enabled = isLocal(runtimeUrl) && isLocal(adminUrl);

const pools: Pool[] = [];
const db = (url: string) => {
  const pool = new Pool({ connectionString: url, max: 1 });
  pools.push(pool);
  return drizzle(pool, { schema, casing: "snake_case" });
};
afterAll(async () => Promise.all(pools.map((p) => p.end())));

class Rollback extends Error {}
async function rolledBack<T>(d: ReturnType<typeof db>, fn: (tx: never) => Promise<T>) {
  let out: T | undefined;
  try {
    await d.transaction(async (tx) => {
      out = await fn(tx as never);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return out as T;
}
const code = (e: unknown) =>
  (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;

describe.skipIf(!enabled)("RLS and grants (local database)", () => {
  const runtime = enabled ? db(runtimeUrl!) : (null as never);
  const admin = enabled ? db(adminUrl!) : (null as never);

  it.each([
    "provider_internal",
    "listing_reports",
    "provider_submissions",
    "alert_subscriptions",
    "affiliate_links",
    "affiliate_transactions",
  ])("app_runtime cannot read %s", async (table) => {
    await expect(runtime.execute(sql.raw(`select * from ${table} limit 1`))).rejects.toSatisfy(
      (e) => code(e) === "42501",
    );
  });

  it("app_runtime cannot read admin-only provider columns", async () => {
    await expect(runtime.execute(sql`select admin_notes from providers limit 1`)).rejects.toSatisfy(
      (e) => code(e) === "42501",
    );
    // Public columns, including the new last_verified_at, stay readable.
    await expect(
      runtime.execute(sql`select slug, last_verified_at from providers limit 1`),
    ).resolves.toBeDefined();
  });

  it("public intake can only insert new, unreviewed rows", async () => {
    await rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
      await tx.insert(schema.listingReports).values({ reason: "broken_link" });
    });
    await expect(
      rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
        await tx.insert(schema.listingReports).values({ reason: "other", status: "reviewed" });
      }),
    ).rejects.toSatisfy((e) => code(e) === "42501");
  });

  it("imports land as drafts and stay invisible to the public role", async () => {
    const parsed = parseImport(
      readFileSync(join(process.cwd(), "data/import/claude_integration_package.json"), "utf8"),
      "json",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await rolledBack(admin, async (tx: ReturnType<typeof db>) => {
      const l = await importLookups(tx, parsed.providers);
      expect(l.errors).toEqual([]);
      await applyProviders(tx as never, parsed.providers, l, null as never);
      const provs = await tx.execute<{ slug: string; status: string }>(
        sql`select slug, status from providers where slug in ('dreamstime','joinbrands')`,
      );
      const opps = await tx.execute<{ status: string; dest: string | null }>(
        sql`select o.status, l.destination_url as dest from opportunities o
            join providers p on p.id = o.provider_id
            left join affiliate_links l on l.id = o.affiliate_link_id
            where p.slug in ('dreamstime','joinbrands')`,
      );
      const internal = await tx.execute<{ n: number }>(
        sql`select count(*)::int as n from provider_internal i join providers p on p.id = i.provider_id where p.slug in ('dreamstime','joinbrands')`,
      );
      return { provs: provs.rows, opps: opps.rows, internal: internal.rows[0].n };
    });
    expect(result.provs.map((p) => p.status)).toEqual(["draft", "draft"]);
    expect(result.opps.every((o) => o.status === "draft")).toBe(true);
    expect(result.opps.map((o) => o.dest).sort()).toEqual([
      "https://joinbrands.com/?ref=ccIo2N",
      "https://www.dreamstime.com/#res62198923",
    ]);
    expect(result.internal).toBe(2);
  });
});
