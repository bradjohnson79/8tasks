"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { affiliatePrograms, affiliateSyncRuns, affiliateTransactions } from "@/db/schema";
import { parseCsv } from "@/lib/affiliates/csv";
import { CSV_COLUMNS, dateToInstant, earningsEntrySchema, type EarningsEntry } from "@/lib/affiliates/entries";
import { programIds } from "@/lib/affiliates/queries";
import { audit, requireAdmin } from "@/lib/admin";
import { firstError, formToObject, httpsUrlSchema } from "@/lib/validation/admin";

/**
 * Admin-only earnings feed mutations (spec §5). Every action calls requireAdmin()
 * (role + MFA) and writes an audit entry. Amounts are stored as entered; currencies are
 * never converted.
 */

type ActionState = { error: string } | undefined;
const MAX_CSV_BYTES = 1_000_000;
const MAX_CSV_ROWS = 5000;

function toValues(e: EarningsEntry, network: string, source: "manual" | "csv_import", userId: string) {
  return {
    programId: e.program_id,
    network,
    externalId: e.external_id ?? null,
    type: e.type,
    status: e.status,
    eventAt: dateToInstant(e.event_date),
    postedAt: new Date(),
    paidAt: e.payout_date ? dateToInstant(e.payout_date) : null,
    clicks: e.clicks ?? null,
    conversions: e.conversions ?? null,
    commissionAmount: e.commission_amount.toFixed(2),
    currency: e.currency,
    payoutMethod: e.payout_method ?? null,
    note: e.notes ?? null,
    source,
    syncedAt: new Date(),
    createdBy: userId,
  };
}

type TxValues = ReturnType<typeof toValues>;

async function upsert(tx: Parameters<Parameters<Awaited<ReturnType<typeof requireAdmin>>["db"]["transaction"]>[0]>[0], v: TxValues) {
  if (!v.externalId) {
    await tx.insert(affiliateTransactions).values(v);
    return;
  }
  await tx
    .insert(affiliateTransactions)
    .values(v)
    .onConflictDoUpdate({
      target: [affiliateTransactions.programId, affiliateTransactions.source, affiliateTransactions.externalId],
      targetWhere: sql`${affiliateTransactions.externalId} is not null`,
      set: {
        type: v.type,
        status: v.status,
        eventAt: v.eventAt,
        paidAt: v.paidAt,
        clicks: v.clicks,
        conversions: v.conversions,
        commissionAmount: v.commissionAmount,
        currency: v.currency,
        payoutMethod: v.payoutMethod,
        note: v.note,
        syncedAt: v.syncedAt,
      },
    });
}

// ---------------------------------------------------------------------------
// Manual entry
// ---------------------------------------------------------------------------
export async function saveEarningsEntry(form: FormData): Promise<ActionState> {
  const { session, db } = await requireAdmin();
  const parsed = earningsEntrySchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const e = parsed.data;
  const programs = await programIds(db, [e.program_id]);
  const program = programs.get(e.program_id);
  if (!program) return { error: "Unknown program." };

  try {
    await db.transaction(async (tx) => {
      const v = toValues(e, program.network, "manual", session.user.id);
      await upsert(tx, v);
      await tx.insert(affiliateSyncRuns).values({ source: `manual:${e.program_id}`, status: "ok", finishedAt: new Date(), rowsUpserted: 1 });
      await audit(tx, session.user.id, "earnings.manual_entry", "affiliate_program", e.program_id, null, v);
    });
  } catch (err) {
    console.error(err);
    return { error: "Couldn't save the entry. Nothing was changed." };
  }
  redirect(`/admin/earnings?saved=${encodeURIComponent("Entry saved.")}`);
}

// ---------------------------------------------------------------------------
// CSV import (all-or-nothing)
// ---------------------------------------------------------------------------
export async function importEarningsCsv(form: FormData): Promise<ActionState> {
  const { session, db } = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > MAX_CSV_BYTES) return { error: "File is larger than 1 MB. Split it and import in parts." };
  const filename = file.name.replace(/[^\w.\- ]/g, "").slice(0, 120) || "upload.csv";

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "The file has no data rows." };
  if (rows.length - 1 > MAX_CSV_ROWS) return { error: `Too many rows (max ${MAX_CSV_ROWS}).` };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { error: `Missing columns: ${missing.join(", ")}. Download the template for the exact header.` };

  const entries: EarningsEntry[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const obj = Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""]));
    const parsed = earningsEntrySchema.safeParse(obj);
    if (parsed.success) entries.push(parsed.data);
    else errors.push(`Row ${i + 2}: ${firstError(parsed.error)}`);
  });

  const programs = await programIds(db, [...new Set(entries.map((e) => e.program_id))]);
  entries.forEach((e, i) => {
    if (!programs.has(e.program_id)) errors.push(`Row ${i + 2}: unknown program_id "${e.program_id}"`);
  });
  if (errors.length) {
    return { error: `Nothing imported. Fix these and try again:\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n…and ${errors.length - 10} more` : ""}` };
  }

  try {
    await db.transaction(async (tx) => {
      for (const e of entries) await upsert(tx, toValues(e, programs.get(e.program_id)!.network, "csv_import", session.user.id));
      await tx.insert(affiliateSyncRuns).values({
        source: "csv_import",
        status: "ok",
        finishedAt: new Date(),
        rowsUpserted: entries.length,
        message: filename,
      });
      await audit(tx, session.user.id, "earnings.csv_import", "affiliate_transactions", null, null, {
        filename,
        rows: entries.length,
        programs: [...programs.keys()],
      });
    });
  } catch (err) {
    console.error(err);
    return { error: "Import failed. Nothing was changed." };
  }
  redirect(`/admin/earnings?saved=${encodeURIComponent(`Imported ${entries.length} rows from ${filename}.`)}`);
}

// ---------------------------------------------------------------------------
// Program registry
// ---------------------------------------------------------------------------
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const programSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  name: z.string().trim().min(2).max(120),
  network: z.enum(["direct", "impact", "awin", "cj", "flexoffers", "daisycon", "maxbounty", "offerjuice", "undecided"]),
  status: z.enum(["live", "pending_signup", "waiting_for_site", "paused", "not_in_scope"]),
  networkCampaignId: optionalText(80),
  payoutMethod: optionalText(60),
  currencyDefault: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[A-Z]{3}$/.test(v), "Currency must be a 3-letter code"),
  affiliateUrl: z.union([z.literal(""), httpsUrlSchema]).optional().transform((v) => (v ? v : null)),
  dataMethod: optionalText(200),
  docsUrl: z.union([z.literal(""), httpsUrlSchema]).optional().transform((v) => (v ? v : null)),
  notes: optionalText(2000),
});

export async function saveProgram(existingId: string | null, form: FormData): Promise<ActionState> {
  const { session, db } = await requireAdmin();
  const parsed = programSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      if (existingId) {
        const [before] = await tx.select().from(affiliatePrograms).where(eq(affiliatePrograms.id, existingId));
        if (!before) throw new Error("not found");
        const { id: _ignored, ...rest } = data;
        void _ignored;
        const [after] = await tx.update(affiliatePrograms).set(rest).where(eq(affiliatePrograms.id, existingId)).returning();
        await audit(tx, session.user.id, "affiliate_program.update", "affiliate_program", existingId, before, after);
      } else {
        const [created] = await tx.insert(affiliatePrograms).values(data).returning();
        await audit(tx, session.user.id, "affiliate_program.create", "affiliate_program", created.id, null, created);
      }
    });
  } catch (err) {
    const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return { error: "That program id already exists." };
    if (code === "23514") return { error: "A value failed a database check (URLs must start with https://)." };
    console.error(err);
    return { error: "Couldn't save the program. Nothing was changed." };
  }
  redirect(`/admin/earnings/programs?saved=${encodeURIComponent("Program saved.")}`);
}
