import { z } from "zod";
import { fixRegion, prefsObject } from "@/lib/email/prefs";

/** Profile = email prefs fields minus frequency, plus display name and experience level. */
export const profileSchema = prefsObject
  .omit({ frequency: true, searchQuery: true })
  .extend({
    displayName: z.string().trim().max(60).default(""),
    experienceLevel: z.union([z.literal(""), z.enum(["new", "some", "experienced"])]).default(""),
  })
  .transform((p) => {
    const f = fixRegion(p);
    return { ...f, displayName: f.displayName || null, experienceLevel: f.experienceLevel || null };
  });

export const missionSchema = z.object({
  providerName: z.string().trim().min(1, "Enter the provider").max(80),
  title: z.string().trim().min(2, "Enter what you're doing").max(160),
  status: z.enum(["interested", "applied", "in_progress", "completed", "not_pursuing"]).default("interested"),
  notes: z.string().trim().max(2000).default(""),
  opportunityId: z.union([z.literal(""), z.string().uuid()]).default(""),
});

const cents = z
  .string()
  .trim()
  .default("")
  .transform((v, ctx) => {
    if (!v) return 0;
    const n = Number(v.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 12.50" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

export const earningSchema = z.object({
  providerName: z.string().trim().min(1, "Enter the provider").max(80),
  activity: z.string().trim().max(160).default(""),
  earnedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  amount: cents,
  expenses: cents,
  reimbursement: cents,
  currency: z.enum(["USD", "CAD"]).default("USD"),
  status: z.enum(["expected", "received"]).default("expected"),
  notes: z.string().trim().max(2000).default(""),
});

/** Totals per currency; reimbursements are tracked separately and never counted as income. */
export function earningTotals(
  rows: { currency: string; status: string; amountCents: number; expensesCents: number; reimbursementCents: number }[],
) {
  const out: Record<string, { expected: number; received: number; expenses: number; reimbursements: number; net: number }> = {};
  for (const r of rows) {
    const t = (out[r.currency] ??= { expected: 0, received: 0, expenses: 0, reimbursements: 0, net: 0 });
    if (r.status === "received") t.received += r.amountCents;
    else t.expected += r.amountCents;
    t.expenses += r.expensesCents;
    t.reimbursements += r.reimbursementCents;
  }
  for (const t of Object.values(out)) t.net = t.received - t.expenses;
  return out;
}
