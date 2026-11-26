import Link from "next/link";
import { FormMessage } from "@/components/admin/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatVancouver, resolvePeriod } from "@/lib/affiliates/period";
import { loadEarnings } from "@/lib/affiliates/queries";
import { isEarning, totalsByCurrency } from "@/lib/affiliates/rollup";
import { requireAdminPage } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "8Tasks affiliate earnings" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, currencyDisplay: "code" }).format(
    n,
  );

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  pending_signup: "Pending signup",
  waiting_for_site: "Waiting for site",
  paused: "Paused",
  not_in_scope: "Not in scope",
};

export default async function EarningsPage({ searchParams }: { searchParams: SP }) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const period = resolvePeriod(sp.period, new Date(), sp.from, sp.to);
  const view = sp.view === "quiet" ? "quiet" : "earning";
  const { programs, stats, runs } = await loadEarnings(db, period);

  const earning = stats.filter(isEarning);
  const earningIds = new Set(earning.map((s) => s.programId));
  const quiet = programs.filter((p) => p.status !== "not_in_scope" && !earningIds.has(p.id));
  const totals = totalsByCurrency(earning);
  const qs = (extra: Record<string, string>) =>
    `?${new URLSearchParams({ period: period.kind, ...(period.kind === "custom" ? { from: period.from, to: period.to } : {}), ...extra })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">8Tasks affiliate earnings</h1>
          <p className="text-sm text-muted-foreground">
            Commissions 8Tasks earns as an affiliate. Not user balances. {period.label}{" "}
            (America/Vancouver).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/admin/earnings/new">Add entry</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/earnings/import">Import CSV</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/earnings/programs">Programs</Link>
          </Button>
        </div>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 text-sm"
      >
        <input type="hidden" name="view" value={view} />
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Period</span>
          <select
            name="period"
            defaultValue={period.kind}
            className="h-10 rounded-xl border bg-background px-3"
          >
            <option value="month">This month</option>
            <option value="last30">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            name="from"
            defaultValue={period.from}
            className="h-10 rounded-xl border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            name="to"
            defaultValue={period.to}
            className="h-10 rounded-xl border bg-background px-3"
          />
        </label>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        <p className="w-full text-xs text-muted-foreground">From/To apply when Period is Custom.</p>
      </form>

      <section aria-label="Last synced" className="rounded-2xl border bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Last synced</h2>
        {runs.length === 0 ? (
          <p className="text-muted-foreground">No syncs, imports or postbacks yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            {runs.map((r) => (
              <li key={r.source} title={r.message ?? undefined}>
                <span className="font-medium text-foreground">{r.source}</span>{" "}
                {formatVancouver(r.at)}
                {r.status !== "ok" && (
                  <span
                    className={cn("ml-1", r.status === "error" ? "text-red-400" : "text-amber-300")}
                  >
                    ({r.status.replace("_", " ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Totals by currency">
        {totals.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No affiliate earnings recorded for {period.label}.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map((t) => (
              <li key={t.currency} className="rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold">{t.currency}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm tabular-nums">
                  <div>
                    <dt className="text-muted-foreground">Pending</dt>
                    <dd>{fmt(t.pending, t.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Approved</dt>
                    <dd>{fmt(t.approved, t.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="font-semibold text-primary">{fmt(t.paid, t.currency)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav aria-label="Program views" className="flex gap-2 text-sm">
        <Link
          href={qs({ view: "earning" })}
          aria-current={view === "earning" ? "page" : undefined}
          className={cn(
            "rounded-full border px-4 py-2",
            view === "earning" && "bg-secondary text-secondary-foreground",
          )}
        >
          Earning ({earning.length})
        </Link>
        <Link
          href={qs({ view: "quiet" })}
          aria-current={view === "quiet" ? "page" : undefined}
          className={cn(
            "rounded-full border px-4 py-2",
            view === "quiet" && "bg-secondary text-secondary-foreground",
          )}
        >
          Configured, no earnings ({quiet.length})
        </Link>
      </nav>

      {view === "earning" ? (
        earning.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No program has conversions or commission in this period.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  {[
                    "Program",
                    "Network",
                    "Clicks",
                    "Conversions",
                    "Pending",
                    "Approved",
                    "Paid",
                    "Currency",
                    "Payout method",
                    "Last payout",
                    "Source",
                    "Last synced",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {earning.map((s) => (
                  <tr key={`${s.programId}-${s.currency}`}>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2">{s.network}</td>
                    <td className="px-3 py-2">{s.clicks ?? "—"}</td>
                    <td className="px-3 py-2">{s.conversions}</td>
                    <td className="px-3 py-2">{fmt(s.pending, s.currency)}</td>
                    <td className="px-3 py-2">{fmt(s.approved, s.currency)}</td>
                    <td className="px-3 py-2 font-semibold text-primary">
                      {fmt(s.paid, s.currency)}
                    </td>
                    <td className="px-3 py-2">{s.currency}</td>
                    <td className="px-3 py-2">{s.payoutMethod ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatVancouver(s.lastPayoutAt, false)}
                    </td>
                    <td className="px-3 py-2">{s.sources.join(", ")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatVancouver(s.lastSynced)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {quiet.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
            >
              <Link
                href={`/admin/earnings/programs/${p.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {p.name}
              </Link>
              <span className="text-muted-foreground">{p.network}</span>
              <Badge variant={p.status === "live" ? "default" : "outline"}>
                {STATUS_LABEL[p.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{p.dataMethod}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Currencies are never converted or combined. Clicks show “—” when the source doesn&apos;t
        report them.
      </p>
    </div>
  );
}
