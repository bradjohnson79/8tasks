import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { FormMessage } from "@/components/admin/form-message";
import { userEarnings } from "@/db/schema";
import { earningTotals } from "@/lib/account-schemas";
import { requireUser, withUserDb } from "@/lib/account";
import { addEarning, updateEarning } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Earnings", robots: { index: false } };

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default async function EarningsLogPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser("/profile/earnings");
  const sp = await searchParams;
  const rows = await withUserDb(user.id, (tx) => tx.select().from(userEarnings).orderBy(desc(userEarnings.earnedOn)));
  const totals = earningTotals(rows);
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">My Earnings</h1>
        <p className="text-sm text-text-2">
          Self-reported notes, not a wallet or balance. 8Tasks never holds or pays out money;
          providers pay you directly. Reimbursements are tracked separately and are not income.
        </p>
      </div>
      <FormMessage saved={sp.saved} />
      {Object.entries(totals).map(([cur, t]) => (
        <div key={cur} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Received", t.received],
            ["Expected", t.expected],
            ["Expenses", t.expenses],
            ["Received − expenses", t.net],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-xl border bg-surface p-3">
              <p className="text-xs text-text-2">{label} ({cur})</p>
              <p className="text-lg font-semibold tabular-nums">{money(v as number)}</p>
            </div>
          ))}
        </div>
      ))}
      <ul className="flex flex-col gap-2">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {e.providerName}
                {e.activity ? ` · ${e.activity}` : ""}
              </p>
              <p className="text-xs text-text-2">
                {e.earnedOn} · {money(e.amountCents)} {e.currency} ({e.status})
                {e.expensesCents ? ` · expenses ${money(e.expensesCents)}` : ""}
                {e.reimbursementCents ? ` · reimbursed ${money(e.reimbursementCents)}` : ""}
              </p>
            </div>
            <form action={updateEarning.bind(null, e.id) as never} className="flex gap-2">
              {e.status === "expected" && (
                <button type="submit" name="status" value="received" className="h-9 rounded-lg border px-3 text-sm">
                  Mark received
                </button>
              )}
              <button type="submit" name="delete" value="1" className="h-9 rounded-lg px-2 text-sm text-text-2">
                Remove
              </button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-text-2">Nothing logged yet.</li>}
      </ul>
      {rows.length > 0 && (
        <a href="/profile/earnings/export" className="w-fit text-sm text-emerald hover:underline">
          Download CSV
        </a>
      )}
      <section className="rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Log earnings</h2>
        <PublicForm action={addEarning} className="relative grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-provider" className={labelClass}>Provider</label>
            <input id="e-provider" name="providerName" required maxLength={80} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-activity" className={labelClass}>Activity</label>
            <input id="e-activity" name="activity" maxLength={160} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-date" className={labelClass}>Date</label>
            <input id="e-date" name="earnedOn" type="date" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-amount" className={labelClass}>Amount ($)</label>
            <input id="e-amount" name="amount" inputMode="decimal" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-expenses" className={labelClass}>Expenses ($)</label>
            <input id="e-expenses" name="expenses" inputMode="decimal" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-reimb" className={labelClass}>Reimbursed ($)</label>
            <input id="e-reimb" name="reimbursement" inputMode="decimal" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-cur" className={labelClass}>Currency</label>
            <select id="e-cur" name="currency" className={inputClass}>
              <option>USD</option>
              <option>CAD</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-status" className={labelClass}>Status</label>
            <select id="e-status" name="status" className={inputClass}>
              <option value="expected">Expected</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-notes" className={labelClass}>Notes</label>
            <input id="e-notes" name="notes" maxLength={2000} className={inputClass} />
          </div>
          <button type="submit" className={`${buttonClass} sm:col-span-3`}>Add</button>
        </PublicForm>
      </section>
    </Container>
  );
}
