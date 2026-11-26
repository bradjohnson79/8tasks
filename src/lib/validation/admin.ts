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
