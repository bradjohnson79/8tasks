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
    "email_subscribers",
    "email_sends",
    "email_events",
    "email_suppressions",
    "email_settings",
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

  it("email subscriptions only change through token functions (double opt-in)", async () => {
    await rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
      const sub = await tx.execute<{ t: string | null }>(
        sql`select email_subscribe('rls-test@example.com', '{"frequency":"weekly"}'::jsonb, 'c', 'v1', 'test') as t`,
      );
      const confirmToken = sub.rows[0].t;
      expect(confirmToken).toBeTruthy();
      // A third party re-submitting before confirmation can't skip the opt-in.
      const again = await tx.execute<{ t: string | null }>(
        sql`select email_subscribe('rls-test@example.com', '{}'::jsonb, 'c', 'v1', 'test') as t`,
      );
      expect(again.rows[0].t).toBe(confirmToken);
      const conf = await tx.execute<{ token: string | null }>(
        sql`select email_confirm(${confirmToken}::uuid) as token`,
      );
      const token = conf.rows[0].token;
      expect(token).toBeTruthy();
      // Once active, nobody can change it via sign-up (returns null) or re-use the confirm link.
      const third = await tx.execute<{ t: string | null }>(
        sql`select email_subscribe('rls-test@example.com', '{"frequency":"daily"}'::jsonb, 'c', 'v1', 'test') as t`,
      );
      expect(third.rows[0].t).toBeNull();
      const reuse = await tx.execute<{ token: string | null }>(
        sql`select email_confirm(${confirmToken}::uuid) as token`,
      );
      expect(reuse.rows[0].token).toBeNull();
      const prefs = await tx.execute<{ p: { frequency: string; status: string } }>(
        sql`select email_get_prefs(${token}::uuid) as p`,
      );
      expect(prefs.rows[0].p).toMatchObject({ frequency: "weekly", status: "active" });
      const unsub = await tx.execute<{ ok: boolean }>(
        sql`select email_unsubscribe(${token}::uuid) as ok`,
      );
      expect(unsub.rows[0].ok).toBe(true);
    });
  });

  it("re-imports never change status or admin notes; new records land as drafts", async () => {
    const parsed = parseImport(
      readFileSync(join(process.cwd(), "data/import/claude_integration_package.json"), "utf8"),
      "json",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await rolledBack(admin, async (tx: ReturnType<typeof db>) => {
      // Simulate founder edits in /admin, plus a brand-new provider in the file.
      await tx.execute(
        sql`update providers set status = 'archived', admin_notes = 'founder note' where slug = 'dreamstime'`,
      );
      const list = [
        ...parsed.providers,
        { ...parsed.providers[0], slug: "brand-new-co", listing: undefined },
      ];
      const l = await importLookups(tx, list);
      expect(l.errors).toEqual([]);
      await applyProviders(tx as never, list, l, null);
      await applyProviders(tx as never, list, await importLookups(tx, list), null); // idempotent
      const provs = await tx.execute<{ slug: string; status: string; notes: string | null }>(
        sql`select slug, status, admin_notes as notes from providers where slug in ('dreamstime','brand-new-co') order by slug`,
      );
      const opps = await tx.execute<{ slug: string; n: number }>(
        sql`select p.slug, count(*)::int as n from opportunities o join providers p on p.id = o.provider_id
            where p.slug in ('dreamstime','joinbrands','brand-new-co') group by p.slug order by p.slug`,
      );
      const dest = await tx.execute<{ dest: string }>(
        sql`select l.destination_url as dest from affiliate_links l join providers p on p.id = l.provider_id
            where p.slug in ('dreamstime','joinbrands') and l.is_affiliate order by 1`,
      );
      return { provs: provs.rows, opps: opps.rows, dest: dest.rows.map((r) => r.dest) };
    });
    expect(result.provs).toEqual([
      { slug: "brand-new-co", status: "draft", notes: expect.anything() },
      { slug: "dreamstime", status: "archived", notes: "founder note" },
    ]);
    // One listing each: re-runs update, never duplicate.
    expect(result.opps.map((o) => o.n)).toEqual([1, 1, 1]);
    expect(result.dest).toContain("https://www.dreamstime.com/#res62198923");
    expect(result.dest).toContain("https://joinbrands.com/?ref=ccIo2N");
  });

  it("public role sees only published listings and only the free/affiliate flag of links", async () => {
    const rows = await rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
      await tx.execute(sql`select set_config('app.show_demo', 'off', true)`);
      const drafts = await tx.execute<{ n: number }>(
        sql`select count(*)::int as n from opportunities where status <> 'published'`,
      );
      const flags = await tx.execute<{ free: boolean | null }>(
        sql`select not link_is_affiliate(affiliate_link_id) as free from opportunities where affiliate_link_id is not null`,
      );
      let linksReadable = true;
      try {
        await tx.execute(sql`savepoint s`);
        await tx.execute(sql`select destination_url from affiliate_links limit 1`);
      } catch {
        linksReadable = false;
        await tx.execute(sql`rollback to savepoint s`);
      }
      return { drafts: drafts.rows[0].n, flags: flags.rows, linksReadable };
    });
    expect(rows.drafts).toBe(0);
    expect(rows.flags.every((f) => typeof f.free === "boolean")).toBe(true);
    expect(rows.linksReadable).toBe(false);
  });
});

describe.skipIf(!enabled)("user accounts (per-user RLS)", () => {
  const runtime = enabled ? db(runtimeUrl!) : (null as never);
  const owner = process.env.MIGRATION_DATABASE_URL;
  const ownerDb = enabled && isLocal(owner) ? db(owner!) : (null as never);

  it("a user only sees and changes their own rows; guests see none", async () => {
    const a = `test-a-${Date.now()}`;
    const b = `test-b-${Date.now()}`;
    await ownerDb.execute(
      sql`insert into "user" (id, name, email, email_verified) values (${a}, 'A', ${a + "@example.com"}, true), (${b}, 'B', ${b + "@example.com"}, true)`,
    );
    try {
      const as = (id: string) => sql`select set_config('app.user_id', ${id}, true)`;
      const out = await rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
        await tx.execute(as(a));
        await tx.execute(sql`insert into user_saved_items (user_id, item_id) values (${a}, 'x1')`);
        await tx.execute(as(b));
        const seenByB = await tx.execute(sql`select * from user_saved_items`);
        const upd = await tx.execute(sql`update user_saved_items set item_id = 'hacked'`);
        let forged = true;
        try {
          await tx.execute(sql`savepoint s`);
          await tx.execute(
            sql`insert into user_saved_items (user_id, item_id) values (${a}, 'x2')`,
          );
        } catch {
          forged = false;
          await tx.execute(sql`rollback to savepoint s`);
        }
        await tx.execute(as(""));
        const guest = await tx.execute(sql`select * from user_saved_items`);
        await tx.execute(as(a));
        const mine = await tx.execute(sql`select item_id from user_saved_items`);
        return {
          seenByB: seenByB.rows.length,
          updated: upd.rowCount,
          forged,
          guest: guest.rows.length,
          mine: mine.rows,
        };
      });
      expect(out).toEqual({
        seenByB: 0,
        updated: 0,
        forged: false,
        guest: 0,
        mine: [{ item_id: "x1" }],
      });
    } finally {
      await ownerDb.execute(sql`delete from "user" where id in (${a}, ${b})`);
    }
  });

  it("delete_my_account refuses admins and removes a user's data", async () => {
    const u = `test-del-${Date.now()}`;
    await ownerDb.execute(
      sql`insert into "user" (id, name, email, email_verified) values (${u}, 'D', ${u + "@example.com"}, true)`,
    );
    try {
      await runtime.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.user_id', ${u}, true)`);
        await tx.execute(sql`insert into user_saved_items (user_id, item_id) values (${u}, 'x')`);
        await tx.execute(sql`select delete_my_account()`);
      });
      const left = await ownerDb.execute(sql`select 1 from "user" where id = ${u}`);
      expect(left.rows.length).toBe(0);
    } finally {
      await ownerDb.execute(sql`delete from "user" where id = ${u}`);
    }
    const adm = await ownerDb.execute<{ id: string }>(
      sql`select id from "user" where role = 'admin' limit 1`,
    );
    if (adm.rows[0]) {
      const r = await rolledBack(runtime, async (tx: ReturnType<typeof db>) => {
        await tx.execute(sql`select set_config('app.user_id', ${adm.rows[0].id}, true)`);
        return (await tx.execute<{ ok: boolean }>(sql`select delete_my_account() as ok`)).rows[0]
          .ok;
      });
      expect(r).toBe(false);
    }
  });
});
