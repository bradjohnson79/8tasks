import { Button } from "@/components/ui/button";
import { AdminForm } from "@/components/admin/admin-form";
import type { opportunities } from "@/db/schema";
import {
  CheckboxField,
  CountriesField,
  STATUS_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
} from "./fields";

type Opportunity = typeof opportunities.$inferSelect;
type Option = { value: string; label: string };

export type OpportunityFormOptions = {
  providers: Option[];
  categories: Option[];
  subcategories: Option[];
  links: Option[];
};

const DATA_SOURCE_OPTIONS = [
  { value: "provider_level", label: "Provider-level listing (general sign-up)" },
  { value: "authorized_feed", label: "Specific mission from an authorized feed" },
  { value: "authorized_manual", label: "Specific mission entered with written permission" },
];

export function OpportunityForm({
  action,
  opportunity,
  options,
  defaultProviderId,
}: {
  action: (form: FormData) => Promise<{ error: string } | undefined | void>;
  opportunity?: Opportunity;
  options: OpportunityFormOptions;
  defaultProviderId?: string;
}) {
  return (
    <AdminForm action={action} className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="providerId"
          label="Provider"
          defaultValue={opportunity?.providerId ?? defaultProviderId}
          options={options.providers}
          required
          placeholder="Choose a provider"
        />
        <SelectField
          name="affiliateLinkId"
          label="Affiliate link"
          defaultValue={opportunity?.affiliateLinkId}
          options={options.links}
          placeholder="None yet (can't publish)"
          hint="Must belong to the chosen provider."
        />
        <SelectField
          name="categoryId"
          label="Category"
          defaultValue={opportunity?.categoryId}
          options={options.categories}
          required
          placeholder="Choose a category"
        />
        <SelectField
          name="subcategoryId"
          label="Subcategory"
          defaultValue={opportunity?.subcategoryId}
          options={options.subcategories}
          placeholder="None"
          hint="Must belong to the chosen category."
        />
        <TextField name="title" label="Title" defaultValue={opportunity?.title} required />
        <TextField
          name="slug"
          label="Slug"
          defaultValue={opportunity?.slug}
          required
          hint="Unique per provider, e.g. member-surveys"
        />
        <div className="sm:col-span-2">
          <TextField
            name="summary"
            label="Short summary"
            defaultValue={opportunity?.summary}
            hint="Shown on cards. Describe the task, not earnings."
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            name="description"
            label="Description"
            defaultValue={opportunity?.description}
          />
        </div>
        <CountriesField defaultValue={opportunity?.countries} />
        <SelectField
          name="dataSource"
          label="Data source"
          defaultValue={opportunity?.dataSource ?? "provider_level"}
          options={DATA_SOURCE_OPTIONS}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={opportunity?.status ?? "draft"}
          options={STATUS_OPTIONS}
        />
        <TextField
          name="sortOrder"
          label="Sort order"
          type="number"
          defaultValue={String(opportunity?.sortOrder ?? 0)}
          hint="Lower numbers show first."
        />
        <CheckboxField
          name="isSponsored"
          label="Sponsored placement"
          defaultChecked={opportunity?.isSponsored}
          hint="Shows a 'Sponsored' label on the site."
        />
      </section>
      <div>
        <Button type="submit">{opportunity ? "Save opportunity" : "Create opportunity"}</Button>
      </div>
    </AdminForm>
  );
}
