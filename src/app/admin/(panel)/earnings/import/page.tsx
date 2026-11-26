import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { Button } from "@/components/ui/button";
import { CSV_COLUMNS } from "@/lib/affiliates/entries";
import { requireAdminPage } from "@/lib/admin";
import { importEarningsCsv } from "../../../earnings-actions";

export const metadata = { title: "Import earnings CSV" };

export default async function ImportEarningsPage() {
  await requireAdminPage();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/earnings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Earnings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Import earnings CSV</h1>
        <p className="text-sm text-muted-foreground">
          All-or-nothing: if any row is invalid, nothing is imported and you&apos;ll see which rows
          to fix. Rows with an external_id update earlier imports of the same id instead of
          duplicating them.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-4 text-sm">
        <p className="font-medium">Required header (in any order)</p>
        <code className="mt-2 block break-all text-xs text-muted-foreground">
          {CSV_COLUMNS.join(",")}
        </code>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            status: pending, approved, paid or reversed (network words like declined/open are
            mapped).
          </li>
          <li>
            Rows with clicks or conversions are period summaries; others are single transactions.
          </li>
          <li>Dates as YYYY-MM-DD. Currency as a 3-letter code. Amounts are never converted.</li>
        </ul>
        <a
          href="/admin/earnings/template"
          className="mt-3 inline-block font-medium text-primary underline-offset-4 hover:underline"
        >
          Download the template
        </a>
      </div>
      <AdminForm
        action={importEarningsCsv}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          CSV file (max 1 MB)
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        </label>
        <div>
          <Button type="submit">Import</Button>
        </div>
      </AdminForm>
      <p className="text-xs text-muted-foreground">
        Pond5&apos;s referral CSV (Dashboard → Financials) needs a column mapping once a sample
        export exists; until then, convert it to this template.
      </p>
    </div>
  );
}
