import "server-only";
import { adminDbUnsafe } from "@/db/client";
import { affiliateSyncRuns } from "@/db/schema";
import { CONNECTORS } from "./connectors";

/**
 * Daily sync (spec §3): last 7 days plus the current month, so late approvals and
 * reversals catch up. Each connector is isolated: one failure never stops the others,
 * and missing credentials are recorded as "not_configured", not errors.
 */
export async function runScheduledSync(now = new Date()) {
  const db = adminDbUnsafe();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const from = monthStart < weekAgo ? monthStart : weekAgo;
  const results: { source: string; status: string; message?: string }[] = [];

  for (const c of CONNECTORS) {
    const startedAt = new Date();
    let r;
    try {
      r = await c.syncTransactions(from, now);
    } catch (err) {
      r = {
        status: "error" as const,
        message: err instanceof Error ? err.message.slice(0, 300) : "Unknown error",
      };
    }
    await db.insert(affiliateSyncRuns).values({
      source: `${c.id}_api`,
      status: r.status,
      startedAt,
      finishedAt: new Date(),
      rowsUpserted: r.status === "ok" ? r.rowsUpserted : 0,
      message: "message" in r ? r.message : undefined,
    });
    results.push({
      source: `${c.id}_api`,
      status: r.status,
      message: "message" in r ? r.message : undefined,
    });
  }
  return results;
}
