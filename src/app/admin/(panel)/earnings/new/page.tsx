import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { listPrograms } from "@/lib/affiliates/queries";
import { requireAdminPage } from "@/lib/admin";
import { saveEarningsEntry } from "../../../earnings-actions";

export const metadata = { title: "Add earnings entry" };

export default async function NewEarningsEntryPage() {
  const { db } = await requireAdminPage();
  const programs = await listPrograms(db, false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/earnings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Earnings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add earnings entry</h1>
        <p className="text-sm text-muted-foreground">
          Record what a program&apos;s dashboard shows. Use a period summary for totals (clicks,
          conversions), or one transaction or payout per row. Reimbursements are not commission.
        </p>
      </div>
      <AdminForm action={saveEarningsEntry} className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="program_id"
          label="Program"
          options={programs.map((p) => ({ value: p.id, label: `${p.name} (${p.network})` }))}
          required
          placeholder="Choose a program"
        />
        <SelectField
          name="type"
          label="Entry type"
          defaultValue="summary"
          options={[
            { value: "summary", label: "Period summary (totals)" },
            { value: "conversion", label: "Single conversion / commission" },
            { value: "payout", label: "Payout received" },
            { value: "adjustment", label: "Adjustment / clawback" },
          ]}
        />
        <TextField
          name="event_date"
          label="Date"
          type="date"
          defaultValue={today}
          required
          hint="For a period summary, the last day of the period."
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue="pending"
          options={[
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved (payable, not yet paid)" },
            { value: "paid", label: "Paid" },
            { value: "reversed", label: "Reversed / declined" },
          ]}
        />
        <TextField
          name="commission_amount"
          label="Commission amount"
          type="number"
          placeholder="0.00"
          hint="Negative for clawbacks."
        />
        <TextField
          name="currency"
          label="Currency"
          defaultValue="USD"
          required
          hint="3-letter code. Never converted."
        />
        <TextField
          name="clicks"
          label="Clicks (optional)"
          type="number"
          hint="Leave blank if the program doesn't report clicks."
        />
        <TextField name="conversions" label="Conversions (optional)" type="number" />
        <TextField
          name="payout_method"
          label="Payout method (optional)"
          placeholder="e.g. PayPal"
        />
        <TextField
          name="payout_date"
          label="Payout date (optional)"
          type="date"
          hint="Required for paid payout rows."
        />
        <TextField
          name="external_id"
          label="External id (optional)"
          hint="Program's transaction/payment id. Re-entering the same id updates the row."
        />
        <div className="sm:col-span-2">
          <TextAreaField name="notes" label="Note (optional)" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Save entry</Button>
        </div>
      </AdminForm>
    </div>
  );
}
