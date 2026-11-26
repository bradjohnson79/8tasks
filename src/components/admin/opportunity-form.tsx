import { Button } from "@/components/ui/button";
import { AdminForm } from "@/components/admin/admin-form";
import type { opportunities } from "@/db/schema";
import { ATTRIBUTE_KEYS } from "@/lib/missions/types";
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
  secondary: Option[];
  groups: Option[];
};

const COMPENSATION_OPTIONS = [
  { value: "unknown", label: "Unknown (“Check provider for current rates”)" },
  { value: "fixed", label: "Fixed amount" },
  { value: "range", label: "Payment range" },
  { value: "hourly", label: "Hourly (real working time)" },
  { value: "variable", label: "Varies per assignment" },
  { value: "commission", label: "Commission" },
  { value: "hybrid", label: "Base pay + commission" },
  { value: "payment_plus_reimbursement", label: "Payment + reimbursement" },
  { value: "reimbursement_only", label: "Reimbursement only (not pay)" },
  { value: "licensing_royalties", label: "Licensing royalties" },
  { value: "gift_card", label: "Gift cards (not cash)" },
  { value: "free_product", label: "Free product (not cash)" },
  { value: "competition_prize", label: "Competition prize (not cash)" },
  { value: "non_cash", label: "Other non-cash reward" },
];

const ATTRIBUTE_LABELS: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  remote: "From home",
  online: "Fully online",
  inPerson: "In person",
  smartphoneRequired: "Smartphone required",
  computerRequired: "Computer required",
  purchaseRequired: "Purchase required",
  reimbursementAvailable: "Reimbursement available",
  beginnerFriendly: "Beginner friendly",
  portfolioRequired: "Portfolio required",
  audienceRequired: "Audience required",
  applicationRequired: "Application required",
  assessmentRequired: "Qualification test",
  performanceBased: "Performance-based",
  recurringCommission: "Recurring commission",
  localAssignment: "Local assignment",
  cameraRequired: "Camera required",
  productSupplied: "Product supplied (not cash)",
  qualificationRequired: "Professional experience required",
  writtenDeliverable: "Written deliverable",
  videoDeliverable: "Video deliverable",
  photoDeliverable: "Photo deliverable",
  privateFeedback: "Private feedback",
  publicPublication: "Published publicly",
  sponsorshipDisclosureRequired: "Ad disclosure required",
};

const dollars = (c: number | null | undefined) => (c == null ? null : String(c / 100));
const dateOnly = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver" }).format(d) : null;

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
  memberships,
}: {
  action: (form: FormData) => Promise<{ error: string } | undefined | void>;
  opportunity?: Opportunity;
  options: OpportunityFormOptions;
  defaultProviderId?: string;
  memberships?: { secondary: string[]; groups: string[] };
}) {
  const attrs = (opportunity?.attributes ?? {}) as Record<string, boolean>;
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
          hint="Paid placements are future-only. Shows a 'Sponsored' label."
        />
        <CheckboxField
          name="isFeatured"
          label="Editor's pick (unpaid)"
          defaultChecked={opportunity?.isFeatured}
          hint="Independent editorial choice. Never sold."
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border p-4">
        <div>
          <h2 className="text-base font-semibold">Compensation</h2>
          <p className="text-xs text-muted-foreground">
            Only terms the provider publishes or confirmed in writing. Gift cards, free products,
            prizes and reimbursements are never shown as cash.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="compensationType"
            label="Type"
            defaultValue={opportunity?.compensationType ?? "unknown"}
            options={COMPENSATION_OPTIONS}
          />
          <SelectField
            name="currency"
            label="Currency"
            defaultValue={opportunity?.currency}
            options={[
              { value: "USD", label: "USD" },
              { value: "CAD", label: "CAD" },
            ]}
            placeholder="—"
          />
          <TextField
            name="payMin"
            label="Amount / minimum ($)"
            defaultValue={dollars(opportunity?.payMinCents)}
            placeholder="25"
          />
          <TextField
            name="payMax"
            label="Maximum ($, ranges only)"
            defaultValue={dollars(opportunity?.payMaxCents)}
          />
          <TextField
            name="payPeriod"
            label="Amount applies per…"
            defaultValue={opportunity?.payPeriod}
            placeholder="task, article, photo, audio hour…"
            hint="Audio/video pay: say “audio hour”, never “hour”."
          />
          <SelectField
            name="commissionBasis"
            label="Commission basis"
            defaultValue={opportunity?.commissionBasis}
            options={[
              { value: "percent", label: "Percentage" },
              { value: "flat", label: "Flat per referral" },
            ]}
            placeholder="—"
          />
          <TextField
            name="reimbursementItem"
            label="Reimbursed item"
            defaultValue={opportunity?.reimbursementItem}
            placeholder="Meal"
          />
          <TextField
            name="reimbursementMax"
            label="Reimbursement cap ($)"
            defaultValue={dollars(opportunity?.reimbursementMaxCents)}
          />
          <div className="sm:col-span-2">
            <TextField
              name="compensationNote"
              label="Pay note (public)"
              defaultValue={opportunity?.compensationNote}
              hint="Non-cash reward label, or a short verified note, e.g. “Some jobs include a free product (not cash)”."
            />
          </div>
          <CheckboxField
            name="commissionRecurring"
            label="Commission is recurring"
            defaultChecked={opportunity?.commissionRecurring ?? false}
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
        <h2 className="text-base font-semibold sm:col-span-3">Timing & verification</h2>
        <TextField
          name="estimatedMinutes"
          label="Estimated minutes"
          type="number"
          defaultValue={opportunity?.estimatedMinutes?.toString()}
        />
        <TextField
          name="deadlineDate"
          label="Closing date"
          type="date"
          defaultValue={dateOnly(opportunity?.deadlineAt)}
          hint="Only a real provider deadline. Empty = ongoing. Closes automatically."
        />
        <TextField
          name="lastVerifiedAt"
          label="Last verified"
          type="date"
          defaultValue={opportunity?.lastVerifiedAt}
        />
      </section>

      <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
        <h2 className="text-base font-semibold sm:col-span-3">Details (one per line)</h2>
        <TextAreaField
          name="whatYouWillDo"
          label="What you'll do"
          defaultValue={opportunity?.whatYouWillDo.join("\n")}
        />
        <TextAreaField
          name="eligibility"
          label="Eligibility"
          defaultValue={opportunity?.eligibility.join("\n")}
        />
        <TextAreaField
          name="paymentDetails"
          label="Payment information"
          defaultValue={opportunity?.paymentDetails.join("\n")}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <div>
          <h2 className="text-base font-semibold">Attributes</h2>
          <p className="text-xs text-muted-foreground">
            Leave “Unknown” unless the provider states it. Unknown never matches a filter.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ATTRIBUTE_KEYS.map((k) => (
            <SelectField
              key={k}
              name={`attr_${k}`}
              label={ATTRIBUTE_LABELS[k]}
              defaultValue={attrs[k] === true ? "yes" : attrs[k] === false ? "no" : ""}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              placeholder="Unknown"
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border p-4 lg:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-base font-semibold">Also appears in</legend>
          <p className="text-xs text-muted-foreground">
            Secondary categories/subcategories. Same record, no duplicates.
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border p-2">
            {options.secondary.map((o) => (
              <label key={o.value} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  name="secondary"
                  value={o.value}
                  defaultChecked={memberships?.secondary.includes(o.value)}
                  className="size-4 accent-emerald-600"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-base font-semibold">Subsections & pathways</legend>
          <p className="text-xs text-muted-foreground">
            Explicit placement, in addition to what its subcategories imply.
          </p>
          <div className="rounded-lg border p-2">
            {options.groups.map((o) => (
              <label key={o.value} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  name="groups"
                  value={o.value}
                  defaultChecked={memberships?.groups.includes(o.value)}
                  className="size-4 accent-emerald-600"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <div>
        <Button type="submit">{opportunity ? "Save opportunity" : "Create opportunity"}</Button>
      </div>
    </AdminForm>
  );
}
