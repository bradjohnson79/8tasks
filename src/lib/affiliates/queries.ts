import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { adminDbUnsafe } from "@/db/client";
import { affiliatePrograms, affiliateSyncRuns, affiliateTransactions } from "@/db/schema";
import type { Period } from "./period";
import { rollup, type ProgramInfo, type TxRow } from "./rollup";

type AdminDb = ReturnType<typeof adminDbUnsafe>;

/** Everything the /admin/earnings page needs for one period. */
export async function loadEarnings(db: AdminDb, period: Period) {
  const [programs, lastPayouts, txs, runs] = await Promise.all([
    db.select().from(affiliatePrograms).orderBy(asc(affiliatePrograms.name)),
    // Latest payout (all time): payout rows or paid conversions.
    db
      .select({
        programId: affiliateTransactions.programId,
        at: sql<Date>`max(coalesce(${affiliateTransactions.paidAt}, ${affiliateTransactions.eventAt}))`.mapWith(
          (v: string) => new Date(v),
        ),
        method: sql<
          string | null
        >`(array_agg(${affiliateTransactions.payoutMethod} order by coalesce(${affiliateTransactions.paidAt}, ${affiliateTransactions.eventAt}) desc) filter (where ${affiliateTransactions.payoutMethod} is not null))[1]`,
      })
      .from(affiliateTransactions)
      .where(or(eq(affiliateTransactions.type, "payout"), eq(affiliateTransactions.status, "paid")))
      .groupBy(affiliateTransactions.programId),
    db
      .select({
        programId: affiliateTransactions.programId,
        network: affiliateTransactions.network,
        type: affiliateTransactions.type,
        status: affiliateTransactions.status,
        currency: affiliateTransactions.currency,
        commissionAmount: sql<number>`${affiliateTransactions.commissionAmount}::float8`,
        clicks: affiliateTransactions.clicks,
        conversions: affiliateTransactions.conversions,
        source: affiliateTransactions.source,
        syncedAt: affiliateTransactions.syncedAt,
      })
      .from(affiliateTransactions)
      .where(
        and(
          gte(
            sql`coalesce(${affiliateTransactions.paidAt}, ${affiliateTransactions.eventAt})`,
            period.start,
          ),
          lt(
            sql`coalesce(${affiliateTransactions.paidAt}, ${affiliateTransactions.eventAt})`,
            period.end,
          ),
        ),
      ),
    // Latest run per source.
    db
      .selectDistinctOn([affiliateSyncRuns.source], {
        source: affiliateSyncRuns.source,
        status: affiliateSyncRuns.status,
        at: affiliateSyncRuns.startedAt,
        message: affiliateSyncRuns.message,
      })
      .from(affiliateSyncRuns)
      .orderBy(affiliateSyncRuns.source, desc(affiliateSyncRuns.startedAt)),
  ]);

  const payoutBy = new Map(lastPayouts.map((p) => [p.programId, p]));
  const infos: ProgramInfo[] = programs.map((p) => ({
    id: p.id,
    name: p.name,
    network: p.network,
    status: p.status,
    payoutMethod: p.payoutMethod,
    lastPayoutAt: payoutBy.get(p.id)?.at ?? null,
    lastPayoutMethod: payoutBy.get(p.id)?.method ?? null,
  }));
  const stats = rollup(infos, txs as TxRow[]);
  return { programs, infos, stats, runs };
}

export async function listPrograms(db: AdminDb, includeOutOfScope = true) {
  return db
    .select()
    .from(affiliatePrograms)
    .where(includeOutOfScope ? undefined : ne(affiliatePrograms.status, "not_in_scope"))
    .orderBy(asc(affiliatePrograms.name));
}

export async function programIds(db: AdminDb, ids: string[]) {
  if (!ids.length) return new Map<string, { network: string }>();
  const rows = await db
    .select({ id: affiliatePrograms.id, network: affiliatePrograms.network })
    .from(affiliatePrograms)
    .where(inArray(affiliatePrograms.id, ids));
  return new Map(rows.map((r) => [r.id, { network: r.network }]));
}
