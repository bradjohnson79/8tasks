import { z } from "zod";

/** CSV template (spec §5). Stable column order. */
export const CSV_COLUMNS = [
  "program_id",
  "network",
  "event_date",
  "status",
  "clicks",
  "conversions",
  "commission_amount",
  "currency",
  "payout_method",
  "payout_date",
  "external_id",
  "notes",
] as const;

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optional = <T extends z.ZodTypeAny>(t: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), t.optional());

export const STATUS_ALIASES: Record<string, "pending" | "approved" | "paid" | "reversed"> = {
  pending: "pending",
  open: "pending",
  approved: "approved",
  confirmed: "approved",
  locked: "approved",
  paid: "paid",
  reversed: "reversed",
  declined: "reversed",
  disapproved: "reversed",
  canceled: "reversed",
  cancelled: "reversed",
  deleted: "reversed",
};

export const statusSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((s, ctx) => {
    const v = STATUS_ALIASES[s];
    if (!v)
      ctx.addIssue({
        code: "custom",
        message: `Unknown status "${s}" (use pending, approved, paid or reversed)`,
      });
    return v as "pending" | "approved" | "paid" | "reversed";
  });

export const money = z.coerce.number().finite().min(-1_000_000).max(1_000_000);
const count = z.coerce.number().int().min(0).max(100_000_000);

/**
 * One earnings entry, from the manual form or a CSV row.
 * Rows with clicks/conversions become "summary" rows; others are single transactions.
 */
export const earningsEntrySchema = z
  .object({
    program_id: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Unknown program id format"),
    network: optional(z.string().trim().max(40)),
    event_date: dateOnly,
    status: statusSchema,
    clicks: optional(count),
    conversions: optional(count),
    commission_amount: optional(money),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code like USD"),
    payout_method: optional(z.string().trim().max(60)),
    payout_date: optional(dateOnly),
    external_id: optional(z.string().trim().max(200)),
    notes: optional(z.string().trim().max(1000)),
    type: optional(z.enum(["conversion", "adjustment", "payout", "summary"])),
  })
  .transform((e) => ({
    ...e,
    commission_amount: e.commission_amount ?? 0,
    type:
      e.type ??
      (e.clicks !== undefined || e.conversions !== undefined
        ? ("summary" as const)
        : ("conversion" as const)),
  }))
  .refine((e) => e.status !== "paid" || e.type !== "payout" || e.payout_date, {
    message: "Payout rows need a payout_date",
    path: ["payout_date"],
  });

export type EarningsEntry = z.infer<typeof earningsEntrySchema>;

/** Midday Vancouver-safe timestamp for a date-only value (avoids day shifting). */
export function dateToInstant(ymd: string): Date {
  return new Date(`${ymd}T20:00:00Z`); // 12:00 or 13:00 in Vancouver
}
