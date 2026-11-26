/**
 * Per-program, per-currency period rollup (spec §2.3, §6). Pure: easy to test.
 * - Currencies are never mixed or converted.
 * - clicks: null (unknown) unless some row in the period reports clicks.
 * - Reversed rows are excluded from pending/approved/paid.
 * - Payout rows mark money received. They count toward Paid only when the program has
 *   no per-transaction "paid" rows in that currency for the period (avoids double counting).
 */
export type TxRow = {
  programId: string;
  network: string;
  type: "conversion" | "adjustment" | "payout" | "summary";
  status: "pending" | "approved" | "paid" | "reversed";
  currency: string;
  commissionAmount: number;
  clicks: number | null;
  conversions: number | null;
  source: string;
  syncedAt: Date;
};

export type ProgramInfo = {
  id: string;
  name: string;
  network: string;
  status: string;
  payoutMethod: string | null;
  lastPayoutAt: Date | null;
  lastPayoutMethod: string | null;
};

export type StatRow = {
  programId: string;
  name: string;
  network: string;
  currency: string;
  clicks: number | null;
  conversions: number;
  pending: number;
  approved: number;
  paid: number;
  payoutMethod: string | null;
  lastPayoutAt: Date | null;
  sources: string[];
  lastSynced: Date | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function rollup(programs: ProgramInfo[], rows: TxRow[]): StatRow[] {
  const byKey = new Map<string, { info: ProgramInfo; currency: string; rows: TxRow[] }>();
  const info = new Map(programs.map((p) => [p.id, p]));
  for (const r of rows) {
    const p = info.get(r.programId);
    if (!p) continue;
    const key = `${r.programId}|${r.currency}`;
    if (!byKey.has(key)) byKey.set(key, { info: p, currency: r.currency, rows: [] });
    byKey.get(key)!.rows.push(r);
  }
  const out: StatRow[] = [];
  for (const { info: p, currency, rows: rs } of byKey.values()) {
    const earning = rs.filter((r) => r.type !== "payout" && r.status !== "reversed");
    const sum = (status: string) =>
      round2(
        earning.filter((r) => r.status === status).reduce((a, r) => a + r.commissionAmount, 0),
      );
    let paid = sum("paid");
    if (!earning.some((r) => r.status === "paid")) {
      paid = round2(
        rs
          .filter((r) => r.type === "payout" && r.status === "paid")
          .reduce((a, r) => a + r.commissionAmount, 0),
      );
    }
    const clickRows = rs.filter((r) => r.clicks !== null);
    out.push({
      programId: p.id,
      name: p.name,
      network: p.network,
      currency,
      clicks: clickRows.length ? clickRows.reduce((a, r) => a + (r.clicks ?? 0), 0) : null,
      conversions:
        rs.filter((r) => r.type === "conversion" && r.status !== "reversed").length +
        rs.filter((r) => r.type === "summary").reduce((a, r) => a + (r.conversions ?? 0), 0),
      pending: sum("pending"),
      approved: sum("approved"),
      paid,
      payoutMethod: p.payoutMethod ?? p.lastPayoutMethod,
      lastPayoutAt: p.lastPayoutAt,
      sources: [...new Set(rs.map((r) => r.source))].sort(),
      lastSynced: rs.reduce<Date | null>((a, r) => (!a || r.syncedAt > a ? r.syncedAt : a), null),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.currency.localeCompare(b.currency));
}

export function isEarning(s: StatRow): boolean {
  return s.conversions > 0 || s.pending !== 0 || s.approved !== 0 || s.paid !== 0;
}

export type CurrencyTotals = { currency: string; pending: number; approved: number; paid: number };

export function totalsByCurrency(stats: StatRow[]): CurrencyTotals[] {
  const m = new Map<string, CurrencyTotals>();
  for (const s of stats) {
    const t = m.get(s.currency) ?? { currency: s.currency, pending: 0, approved: 0, paid: 0 };
    t.pending = round2(t.pending + s.pending);
    t.approved = round2(t.approved + s.approved);
    t.paid = round2(t.paid + s.paid);
    m.set(s.currency, t);
  }
  return [...m.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
