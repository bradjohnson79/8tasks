import { z } from "zod";
import { SUPPORTED_COUNTRIES } from "@/lib/markets";

const trimmed = z.string().trim();
const optionalText = (max: number) =>
  trimmed
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const slugSchema = trimmed
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

/** https only, no embedded credentials, no whitespace, not a bare IP or localhost. */
export const httpsUrlSchema = trimmed.max(2048).superRefine((value, ctx) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Enter a full URL starting with https://",
    });
    return;
  }
  if (url.protocol !== "https:")
    ctx.addIssue({ code: "custom", message: "URL must start with https://" });
  if (url.username || url.password)
    ctx.addIssue({
      code: "custom",
      message: "URL must not contain a username or password",
    });
  if (/\s/.test(value)) ctx.addIssue({ code: "custom", message: "URL must not contain spaces" });
  const host = url.hostname;
  if (host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) {
    ctx.addIssue({
      code: "custom",
      message: "URL must use a public domain name",
    });
  }
});

const optionalHttpsUrl = z
  .union([z.literal(""), httpsUrlSchema])
  .optional()
  .transform((v) => (v ? v : null));

/** Checkbox group of supported countries; at least one is required. */
export const countriesSchema = z
  .array(z.enum(SUPPORTED_COUNTRIES))
  .min(1, "Pick at least one supported country (Canada or US)")
  .transform((list) => [...new Set(list)].sort());

const capability = z.enum(["unknown", "yes", "no"]);
const status = z.enum(["draft", "published", "archived"]);

export const providerSchema = z.object({
  name: trimmed.min(2).max(120),
  slug: slugSchema,
  websiteUrl: optionalHttpsUrl,
  logoUrl: optionalHttpsUrl,
  summary: optionalText(280),
  description: optionalText(5000),
  countries: countriesSchema,
  status,
  affiliateNetwork: optionalText(120),
  supportsSubIds: capability,
  supportsPostbacks: capability,
  providesFeed: capability,
  allowsRevenueShare: capability,
  adminNotes: optionalText(5000),
});

export const affiliateLinkSchema = z.object({
  label: trimmed.min(2).max(120),
  destinationUrl: httpsUrlSchema,
  subidParam: z
    .union([z.literal(""), z.enum(["subId1", "clickRef", "fobs", "s2", "sid"])])
    .optional()
    .transform((v) => v || null),
  isActive: z.boolean(),
  adminNotes: optionalText(2000),
});

const uuid = z.string().uuid();

export const opportunitySchema = z.object({
  providerId: uuid,
  categoryId: uuid,
  subcategoryId: z
    .union([z.literal(""), uuid])
    .optional()
    .transform((v) => v || null),
  affiliateLinkId: z
    .union([z.literal(""), uuid])
    .optional()
    .transform((v) => v || null),
  title: trimmed.min(3).max(160),
  slug: slugSchema,
  summary: optionalText(280),
  description: optionalText(5000),
  countries: countriesSchema,
  dataSource: z.enum(["provider_level", "authorized_feed", "authorized_manual"]),
  status,
  isSponsored: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

// ---------------------------------------------------------------------------
// Opportunity details (master prompt §2): verified compensation, attributes,
// deadline, verification date, editor's pick, secondary categories and groups.
// ---------------------------------------------------------------------------
export const COMPENSATION_TYPES = [
  "unknown",
  "fixed",
  "range",
  "hourly",
  "variable",
  "reimbursement_only",
  "payment_plus_reimbursement",
  "commission",
  "hybrid",
  "non_cash",
  "gift_card",
  "free_product",
  "competition_prize",
  "licensing_royalties",
] as const;

/** Dollars typed by the admin → integer cents (null when empty). */
const moneyCents = trimmed
  .max(12)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 25 or 12.50" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

const optionalInt = (min: number, max: number) =>
  trimmed.optional().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `Enter a whole number from ${min} to ${max}` });
      return z.NEVER;
    }
    return n;
  });

const isoDate = trimmed.optional().transform((v, ctx) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    ctx.addIssue({ code: "custom", message: "Use a date like 2026-12-31" });
    return z.NEVER;
  }
  return v;
});

/** One item per line. */
const lines = trimmed
  .max(5000)
  .optional()
  .transform((v) =>
    (v ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

export const opportunityDetailsSchema = z
  .object({
    compensationType: z.enum(COMPENSATION_TYPES).default("unknown"),
    payMin: moneyCents,
    payMax: moneyCents,
    currency: z
      .union([z.literal(""), z.enum(["USD", "CAD"])])
      .optional()
      .transform((v) => v || null),
    payPeriod: optionalText(40),
    commissionBasis: z
      .union([z.literal(""), z.enum(["percent", "flat"])])
      .optional()
      .transform((v) => v || null),
    commissionRecurring: z.boolean(),
    reimbursementItem: optionalText(60),
    reimbursementMax: moneyCents,
    compensationNote: optionalText(200),
    estimatedMinutes: optionalInt(1, 10080),
    whatYouWillDo: lines,
    eligibility: lines,
    paymentDetails: lines,
    deadlineDate: isoDate,
    lastVerifiedAt: isoDate,
    isFeatured: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const need = (ok: boolean, message: string) => !ok && ctx.addIssue({ code: "custom", message });
    const t = d.compensationType;
    if (["fixed", "range", "hourly", "payment_plus_reimbursement"].includes(t)) {
      need(d.payMin !== null, "Enter the verified amount (or choose Unknown)");
      need(d.currency !== null, "Choose the currency");
    }
    if (t === "range") {
      need(d.payMax !== null, "Enter the maximum of the range");
      need(
        d.payMin === null || d.payMax === null || d.payMin <= d.payMax,
        "Minimum must not exceed maximum",
      );
    }
    if (t === "reimbursement_only" || t === "payment_plus_reimbursement")
      need(d.reimbursementItem !== null, "Say what is reimbursed (e.g. Meal)");
    if (t === "non_cash") need(d.compensationNote !== null, "Describe the non-cash reward");
  })
  .transform(({ payMin, payMax, reimbursementMax, deadlineDate, ...rest }) => ({
    ...rest,
    payMinCents: payMin,
    payMaxCents: payMax,
    reimbursementMaxCents: reimbursementMax,
    // A deadline date closes at the end of that day, Vancouver time (UTC-7).
    deadlineAt: deadlineDate ? new Date(`${deadlineDate}T23:59:59-07:00`) : null,
  }));

/** Attribute selects: "" (unknown) | "yes" | "no" → only known facts are stored. */
export function attributesFromForm(form: FormData, keys: readonly string[]) {
  const out: Record<string, boolean> = {};
  for (const k of keys) {
    const v = form.get(`attr_${k}`);
    if (v === "yes") out[k] = true;
    else if (v === "no") out[k] = false;
  }
  return out;
}

const uuidList = (form: FormData, key: string) =>
  form
    .getAll(key)
    .map(String)
    .filter((v) => /^[0-9a-f-]{36}$/.test(v));

/** Secondary categories are posted as "categoryId|subcategoryId" (subcategory optional). */
export function membershipsFromForm(form: FormData) {
  const secondary = form
    .getAll("secondary")
    .map(String)
    .map((v) => v.split("|"))
    .filter(([c, s]) => /^[0-9a-f-]{36}$/.test(c) && (!s || /^[0-9a-f-]{36}$/.test(s)))
    .map(([c, s]) => ({ categoryId: c, subcategoryId: s || null }));
  return { secondary, groupIds: uuidList(form, "groups") };
}

export const categorySchema = z.object({
  name: trimmed.min(2).max(80),
  description: optionalText(280),
  icon: optionalText(40),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export const subcategorySchema = z.object({
  categoryId: uuid,
  name: trimmed.min(2).max(80),
  slug: slugSchema,
});

/** Reads a FormData into a plain object: repeated keys become arrays, checkboxes become booleans. */
export function formToObject(
  form: FormData,
  opts: { arrays?: string[]; booleans?: string[] } = {},
) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (opts.arrays?.includes(key)) out[key] = form.getAll(key).map(String);
    else out[key] = String(form.get(key) ?? "");
  }
  for (const key of opts.arrays ?? []) out[key] ??= [];
  for (const key of opts.booleans ?? []) out[key] = form.get(key) === "on";
  return out;
}

export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

// ---------------------------------------------------------------------------
// Admin-only provider commercial facts (provider_internal). Never shown publicly.
// ---------------------------------------------------------------------------
export const COMMISSION_MODELS = [
  "unknown",
  "contributor_recruitment",
  "business_client_referral",
  "product_sales",
  "personal_referral",
  "none",
] as const;

export const providerInternalSchema = z.object({
  lastVerifiedAt: isoDate,
  commissionModel: z.enum(COMMISSION_MODELS).default("unknown"),
  commissionText: optionalText(1000),
  commissionCurrency: z
    .union([z.literal(""), trimmed.toUpperCase().regex(/^[A-Z]{3}$/, "3-letter currency code")])
    .optional()
    .transform((v) => v || null),
  qualifyingAction: optionalText(300),
  trackingWindow: optionalText(120),
  recurringCommission: z
    .enum(["", "yes", "no"])
    .optional()
    .transform((v) => (v === "yes" ? true : v === "no" ? false : null)),
  sourceUrls: trimmed
    .max(5000)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20),
    )
    .pipe(z.array(httpsUrlSchema)),
  readinessLevel: z
    .union([z.literal(""), z.enum(["A", "B", "C", "D", "E"])])
    .optional()
    .transform((v) => v || null),
  approvalStatus: optionalText(120),
  missionAlignment: optionalText(1000),
  businessContact: optionalText(300),
});
