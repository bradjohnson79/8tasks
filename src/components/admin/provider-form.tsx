import { Button } from "@/components/ui/button";
import { AdminForm } from "@/components/admin/admin-form";
import type { providers } from "@/db/schema";
import {
  CAPABILITY_OPTIONS,
  CountriesField,
  STATUS_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
} from "./fields";

type Provider = typeof providers.$inferSelect;

export function ProviderForm({
  action,
  provider,
}: {
  action: (form: FormData) => Promise<{ error: string } | undefined | void>;
  provider?: Provider;
}) {
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
        </div>
        <TextAreaField
          name="adminNotes"
          label="Admin notes (private)"
          defaultValue={provider?.adminNotes}
          hint="Never shown on the site. Record where each fact came from."
        />
      </section>

      <div>
        <Button type="submit">{provider ? "Save provider" : "Create provider"}</Button>
      </div>
    </AdminForm>
  );
}
