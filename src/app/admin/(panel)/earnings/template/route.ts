import { NextResponse } from "next/server";
import { toCsv } from "@/lib/affiliates/csv";
import { CSV_COLUMNS } from "@/lib/affiliates/entries";
import { getSession } from "@/lib/admin";
import { checkAdmin } from "@/lib/admin-policy";

/** Admin-only CSV template download (header + one clearly fake example row). */
export async function GET() {
  const session = await getSession();
  if (checkAdmin(session?.user)) return new NextResponse(null, { status: 404 });
  const body = toCsv([
    [...CSV_COLUMNS],
    ["example-program", "direct", "2026-11-30", "approved", "", "", "12.50", "USD", "PayPal", "", "EXAMPLE-DELETE-ME", "Example row: delete before importing"],
  ]);
  return new NextResponse(body + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="8tasks-earnings-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
