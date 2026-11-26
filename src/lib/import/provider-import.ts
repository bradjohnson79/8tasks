import { z } from "zod";
import { parseCsv } from "@/lib/affiliates/csv";
import { ATTRIBUTE_KEYS } from "@/lib/missions/types";
import {
  COMMISSION_MODELS,
  COMPENSATION_TYPES,
  httpsUrlSchema,
  slugSchema,
} from "@/lib/validation/admin";
import { SUPPORTED_COUNTRIES } from "@/lib/markets";

/**
 * Provider import format (master prompt §3.1). JSON:
 *   { "providers": [ { "slug", "public": {...}, "internal": {...} } ] }
 * or an equivalent CSV (one row per provider + opportunity; see docs/IMPORT_FORMAT.md).
 * Everything imported lands as status = draft. Publishing is a manual admin action.
 * Imported text is untrusted data (CLAUDE.md rule 7): stored as plain text, never executed.
 */

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .nullable()
  .transform((v) => v || null);

const attributes = z
  .record(z.string(), z.boolean())
  .optional()
  .transform((a) => {
    const out: Record<string, boolean> = {};
    for (const k of ATTRIBUTE_KEYS) if (typeof a?.[k] === "boolean") out[k] = a[k];
    return out;
  });

const placement = z.object({ category: slugSchema, subcategory: slugSchema.optional().nullable() });

export const importOpportunitySchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  summary: text(280),
  description: text(5000),
  category: slugSchema,
  subcategory: slugSchema.optional().nullable(),
  secondary: z.array(placement).max(20).default([]),
  subsections: z.array(slugSchema).max(10).default([]),
  compensation_type: z.enum(COMPENSATION_TYPES).default("unknown"),
  compensation_note: text(200),
  attributes,
  countries: z.array(z.enum(SUPPORTED_COUNTRIES)).optional(),
  last_verified_at: isoDate,
});

export const importProviderSchema = z.object({
  slug: slugSchema,
  public: z.object({
    name: z.string().trim().min(2).max(120),
    website_url: z
      .union([z.literal(""), httpsUrlSchema])
      .optional()
      .nullable()
      .transform((v) => v || null),
    summary: text(280),
    description: text(5000),
    countries: z
      .array(z.string())
      .transform((l) => l.map((c) => c.trim().toUpperCase()))
      .pipe(z.array(z.enum(SUPPORTED_COUNTRIES)).min(1, "Needs CA and/or US")),
    last_verified_at: isoDate,
    /** Stored only in affiliate_links (never rendered). */
    affiliate_url: z
      .union([z.literal(""), httpsUrlSchema])
      .optional()
      .nullable()
      .transform((v) => v || null),
    opportunities: z.array(importOpportunitySchema).max(50).default([]),
  }),
  internal: z
    .object({
      commission_model: z.enum(COMMISSION_MODELS).default("unknown"),
      commission_text: text(1000),
      commission_currency: text(3),
      qualifying_action: text(300),
      tracking_window: text(120),
      recurring_commission: z
        .boolean()
        .optional()
        .nullable()
        .transform((v) => v ?? null),
      source_urls: z.array(httpsUrlSchema).max(20).default([]),
      readiness_level: z
        .enum(["A", "B", "C", "D", "E"])
        .optional()
        .nullable()
        .transform((v) => v ?? null),
      approval_status: text(120),
      mission_alignment: text(1000),
      business_contact: text(300),
    })
    .default({
      commission_model: "unknown",
      commission_text: null,
      commission_currency: null,
      qualifying_action: null,
      tracking_window: null,
      recurring_commission: null,
      source_urls: [],
      readiness_level: null,
      approval_status: null,
      mission_alignment: null,
      business_contact: null,
    }),
});

export const importFileSchema = z.object({
  providers: z.array(importProviderSchema).min(1).max(200),
});

export type ImportProvider = z.infer<typeof importProviderSchema>;
export type ImportResult =
  { ok: true; providers: ImportProvider[] } | { ok: false; errors: string[] };

export const CSV_IMPORT_COLUMNS = [
  "slug",
  "name",
  "website_url",
  "summary",
  "description",
  "countries",
  "last_verified_at",
  "affiliate_url",
  "opportunity_slug",
  "opportunity_title",
  "opportunity_summary",
  "category",
  "subcategory",
  "secondary",
  "subsections",
  "compensation_type",
  "compensation_note",
  "attributes",
  "commission_model",
  "commission_text",
  "commission_currency",
  "qualifying_action",
  "tracking_window",
  "recurring_commission",
  "source_urls",
  "readiness_level",
  "approval_status",
  "mission_alignment",
  "business_contact",
] as const;

const list = (v: string | undefined) =>
  (v ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

const yesNo = (v: string | undefined) =>
  /^(yes|true|y|1)$/i.test(v ?? "") ? true : /^(no|false|n|0)$/i.test(v ?? "") ? false : null;

/** CSV → the JSON shape (rows sharing a slug become one provider with several opportunities). */
export function csvToImport(csv: string): unknown {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { providers: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const r of rows.slice(1)) {
    if (r.every((c) => !c.trim())) continue;
    const row = Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]));
    let p = bySlug.get(row.slug) as { public: { opportunities: unknown[] } } | undefined;
    if (!p) {
      p = {
        slug: row.slug,
        public: {
          name: row.name,
          website_url: row.website_url,
          summary: row.summary,
          description: row.description,
          countries: list(row.countries),
          last_verified_at: row.last_verified_at || null,
          affiliate_url: row.affiliate_url,
          opportunities: [],
        },
        internal: {
          commission_model: row.commission_model || "unknown",
          commission_text: row.commission_text,
          commission_currency: row.commission_currency,
          qualifying_action: row.qualifying_action,
          tracking_window: row.tracking_window,
          recurring_commission: yesNo(row.recurring_commission),
          source_urls: list(row.source_urls),
          readiness_level: row.readiness_level || null,
          approval_status: row.approval_status,
          mission_alignment: row.mission_alignment,
          business_contact: row.business_contact,
        },
      } as never;
      bySlug.set(row.slug, p as never);
    }
    if (row.opportunity_slug) {
      const attrs: Record<string, boolean> = {};
      for (const pair of list(row.attributes)) {
        const [k, v] = pair.split("=").map((x) => x.trim());
        const b = yesNo(v);
        if (k && b !== null) attrs[k] = b;
      }
      p!.public.opportunities.push({
        slug: row.opportunity_slug,
        title: row.opportunity_title,
        summary: row.opportunity_summary,
        category: row.category,
        subcategory: row.subcategory || null,
        secondary: list(row.secondary).map((s) => {
          const [category, subcategory] = s.split("/");
          return { category, subcategory: subcategory || null };
        }),
        subsections: list(row.subsections),
        compensation_type: row.compensation_type || "unknown",
        compensation_note: row.compensation_note,
        attributes: attrs,
      });
    }
  }
  return { providers: [...bySlug.values()] };
}

/** Parses + validates an import (JSON or CSV). Never touches the database. */
export function parseImport(raw: string, format: "json" | "csv"): ImportResult {
  let data: unknown;
  try {
    data = format === "json" ? JSON.parse(raw) : csvToImport(raw);
  } catch {
    return { ok: false, errors: ["The file isn't valid JSON."] };
  }
  const parsed = importFileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .slice(0, 15)
        .map((i) => `${i.path.join(".") || "file"}: ${i.message}`),
    };
  }
  const slugs = parsed.data.providers.map((p) => p.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length)
    return { ok: false, errors: [`Duplicate provider slugs: ${[...new Set(dupes)].join(", ")}`] };
  return { ok: true, providers: parsed.data.providers };
}
