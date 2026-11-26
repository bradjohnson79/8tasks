import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { userEarnings } from "@/db/schema";
import { toCsv } from "@/lib/affiliates/csv";
import { getUser, withUserDb } from "@/lib/account";

export const dynamic = "force-dynamic";

/** The signed-in user's own earnings log as CSV. */
export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const rows = await withUserDb(user.id, (tx) => tx.select().from(userEarnings).orderBy(asc(userEarnings.earnedOn)));
  const money = (c: number) => (c / 100).toFixed(2);
  const csv = toCsv([
    ["date", "provider", "activity", "status", "amount", "expenses", "reimbursed", "currency", "notes"],
    ...rows.map((r) => [
      r.earnedOn,
      r.providerName,
      r.activity ?? "",
      r.status,
      money(r.amountCents),
      money(r.expensesCents),
      money(r.reimbursementCents),
      r.currency,
      r.notes ?? "",
    ]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-8tasks-earnings.csv"',
      "Cache-Control": "no-store",
    },
  });
}
