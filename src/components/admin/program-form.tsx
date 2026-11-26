import { Button } from "@/components/ui/button";
import type { affiliatePrograms } from "@/db/schema";
import { AdminForm } from "./admin-form";
import { SelectField, TextAreaField, TextField } from "./fields";

type Program = typeof affiliatePrograms.$inferSelect;

const NETWORKS = [
  "direct",
  "impact",
  "awin",
  "cj",
  "flexoffers",
  "daisycon",
  "maxbounty",
  "offerjuice",
  "undecided",
];
const STATUSES = [
  { value: "live", label: "Live" },
  { value: "pending_signup", label: "Pending signup" },
  { value: "waiting_for_site", label: "Waiting for site" },
  { value: "paused", label: "Paused" },
  { value: "not_in_scope", label: "Not in scope" },
];

export function ProgramForm({
  action,
  program,
}: {
  action: (form: FormData) => Promise<{ error: string } | undefined | void>;
  program?: Program;
}) {
  return (
    <AdminForm action={action} className="grid gap-4 sm:grid-cols-2">
      {program ? (
        <input type="hidden" name="id" value={program.id} />
      ) : (
        <TextField
          name="id"
          label="Program id"
          required
          hint="Use the provider_id from site_links, e.g. pond5"
        />
      )}
      <TextField name="name" label="Name" defaultValue={program?.name} required />
      <SelectField
        name="network"
        label="Network (live tracking path)"
        defaultValue={program?.network ?? "direct"}
        options={NETWORKS.map((n) => ({ value: n, label: n }))}
      />
      <SelectField
        name="status"
        label="Status"
        defaultValue={program?.status ?? "pending_signup"}
        options={STATUSES}
      />
      <TextField
        name="networkCampaignId"
        label="Network campaign id"
        defaultValue={program?.networkCampaignId}
        hint="e.g. Awin CID or Impact CampaignId. Used to match postbacks."
      />
      <TextField
        name="payoutMethod"
        label="Payout method"
        defaultValue={program?.payoutMethod}
        hint="From official docs or your account only."
      />
      <TextField
        name="currencyDefault"
        label="Default currency"
        defaultValue={program?.currencyDefault}
        placeholder="USD"
      />
      <TextField
        name="affiliateUrl"
        label="Live tracked link"
        defaultValue={program?.affiliateUrl}
        placeholder="https://"
      />
      <TextField name="dataMethod" label="Data method" defaultValue={program?.dataMethod} />
      <TextField
        name="docsUrl"
        label="Official docs URL"
        defaultValue={program?.docsUrl}
        placeholder="https://"
      />
      <div className="sm:col-span-2">
        <TextAreaField
          name="notes"
          label="Notes (admin only)"
          defaultValue={program?.notes}
          rows={3}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">{program ? "Save program" : "Add program"}</Button>
      </div>
    </AdminForm>
  );
}
