import { Button } from "@/components/ui/button";
import { AdminForm } from "@/components/admin/admin-form";
import type { providerInternal, providers } from "@/db/schema";
import {
  CAPABILITY_OPTIONS,
  CheckboxField,
  CountriesField,
  STATUS_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
} from "./fields";

type Provider = typeof providers.$inferSelect;
type Internal = typeof providerInternal.$inferSelect;

const COMMISSION_MODEL_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "contributor_recruitment", label: "Contributor recruitment" },
  { value: "business_client_referral", label: "Business client referral" },
  { value: "product_sales", label: "Product sales" },
  { value: "personal_referral", label: "Personal referral" },
  { value: "none", label: "None" },
];
const TRI_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const READINESS_OPTIONS = ["A", "B", "C", "D", "E"].map((l) => ({ value: l, label: l }));

export function ProviderForm({
  action,
  provider,
  internal,
}: {
  action: (form: FormData) => Promise<{ error: string } | undefined | void>;
  provider?: Provider;
  internal?: Internal | null;
}) {
  const tri = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");
  return (
    <AdminForm action={action} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={provider?.name} required />
        <TextField
          name="slug"
          label="Slug"
          defaultValue={provider?.slug}
          required
          hint="Used in the URL: /providers/your-slug"
        />
        <TextField
          name="websiteUrl"
          label="Official website"
          defaultValue={provider?.websiteUrl}
          placeholder="https://"
        />
        <TextField
          name="logoUrl"
          label="Logo URL"
          defaultValue={provider?.logoUrl}
          placeholder="https://"
          hint="Optional. https image link."
        />
        <div className="sm:col-span-2">
          <TextField
            name="summary"
            label="Short summary"
            defaultValue={provider?.summary}
            hint="One sentence shown on cards. Max 280 characters."
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            name="description"
            label="Description"
            defaultValue={provider?.description}
            rows={5}
            hint="Factual description from the provider's own materials. No earnings claims."
          />
        </div>
        <CountriesField defaultValue={provider?.countries} />
        <SelectField
          name="status"
          label="Status"
          defaultValue={provider?.status ?? "draft"}
          options={STATUS_OPTIONS}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border p-4">
        <div>
          <h2 className="font-semibold">Affiliate program facts</h2>
          <p className="text-sm text-muted-foreground">
            Leave as Unknown unless the provider&apos;s documentation or a written confirmation says
            otherwise. Note the source below.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="affiliateNetwork"
            label="Affiliate network"
            defaultValue={provider?.affiliateNetwork}
            placeholder="e.g. Impact, CJ, direct"
          />
          <SelectField
            name="supportsSubIds"
            label="Supports sub-IDs"
            defaultValue={provider?.supportsSubIds ?? "unknown"}
            options={CAPABILITY_OPTIONS}
          />
          <SelectField
            name="supportsPostbacks"
            label="Supports postbacks/webhooks"
            defaultValue={provider?.supportsPostbacks ?? "unknown"}
            options={CAPABILITY_OPTIONS}
          />
          <SelectField
            name="providesFeed"
            label="Provides an offer feed"
            defaultValue={provider?.providesFeed ?? "unknown"}
            options={CAPABILITY_OPTIONS}
          />
          <SelectField
            name="allowsRevenueShare"
            label="Allows revenue share"
            defaultValue={provider?.allowsRevenueShare ?? "unknown"}
            options={CAPABILITY_OPTIONS}
          />
          <SelectField
            name="allowsEmailTraffic"
            label="Allows email-originated traffic (Daily 8)"
            defaultValue={provider?.allowsEmailTraffic ?? "unknown"}
            options={CAPABILITY_OPTIONS}
          />
        </div>
        <TextAreaField
          name="adminNotes"
          label="Admin notes (private)"
          defaultValue={provider?.adminNotes}
          hint="Never shown on the site. Record where each fact came from."
        />
        <TextField
          name="lastVerifiedAt"
          label="Last verified (public)"
          type="date"
          defaultValue={provider?.lastVerifiedAt}
          hint="Date you last checked the provider's public facts. Shown as “Last verified”."
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-dashed p-4">
        <div>
          <h2 className="text-base font-semibold">Commercial terms (admin only)</h2>
          <p className="text-xs text-muted-foreground">
            Stored in an admin-only table. Never rendered on public pages. Record only what the
            provider&apos;s own terms or written confirmation say.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="commissionModel"
            label="Commission model"
            defaultValue={internal?.commissionModel ?? "unknown"}
            options={COMMISSION_MODEL_OPTIONS}
          />
          <SelectField
            name="readinessLevel"
            label="Readiness level (A required to publish)"
            defaultValue={internal?.readinessLevel}
            options={READINESS_OPTIONS}
            placeholder="Not set"
          />
          <TextField
            name="commissionText"
            label="Commission terms"
            defaultValue={internal?.commissionText}
          />
          <TextField
            name="commissionCurrency"
            label="Commission currency"
            defaultValue={internal?.commissionCurrency}
            placeholder="USD"
          />
          <TextField
            name="qualifyingAction"
            label="Qualifying action"
            defaultValue={internal?.qualifyingAction}
          />
          <TextField
            name="trackingWindow"
            label="Tracking window"
            defaultValue={internal?.trackingWindow}
            placeholder="30-day cookie"
          />
          <SelectField
            name="recurringCommission"
            label="Recurring commission"
            defaultValue={tri(internal?.recurringCommission)}
            options={TRI_OPTIONS}
          />
          <CheckboxField
            name="userValueListing"
            label="User-value listing (Level D)"
            defaultChecked={internal?.userValueListing}
            hint="Listed for usefulness only: no affiliate links, no commission claims."
          />
          <TextField
            name="approvalStatus"
            label="Approval status"
            defaultValue={internal?.approvalStatus}
            placeholder="approved / applied / not applied"
          />
          <TextField
            name="businessContact"
            label="Business contact"
            defaultValue={internal?.businessContact}
          />
          <TextField
            name="missionAlignment"
            label="Mission alignment notes"
            defaultValue={internal?.missionAlignment}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              name="sourceUrls"
              label="Source URLs (one per line, https)"
              defaultValue={internal?.sourceUrls.join("\n")}
              rows={3}
            />
          </div>
        </div>
      </section>

      <div>
        <Button type="submit">{provider ? "Save provider" : "Create provider"}</Button>
      </div>
    </AdminForm>
  );
}
