"use server";

import { headers } from "next/headers";
import { withPublicDb } from "@/db/client";
import { listingReports, providerSubmissions } from "@/db/schema";
import { allow } from "@/lib/affiliates/rate-limit";
import { firstError } from "@/lib/validation/admin";
import { reportSchema, submissionSchema } from "@/lib/intake/schemas";

/**
 * Public intake (no account needed). Everything lands in an admin review queue
 * (/admin/inbox); nothing is published automatically. Protected by a honeypot field
 * and a per-IP rate limit. The public DB role can only INSERT these rows.
 */
export type IntakeState = { ok: string } | { error: string } | undefined;

async function guard(form: FormData, bucket: string): Promise<string | null> {
  // Bots fill every field; people never see this one.
  if (String(form.get("company_website") ?? "") !== "") return "Thanks!";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`${bucket}:${ip}`, 5, 10 * 60_000)) return "rate";
  return null;
}

const RATE = "Too many submissions from your connection. Please try again later.";
const FAIL = "Something went wrong. Please try again.";

export async function reportListing(form: FormData): Promise<IntakeState> {
  const g = await guard(form, "report");
  if (g === "rate") return { error: RATE };
  if (g) return { ok: g };
  const parsed = reportSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!parsed.data.opportunityId && !parsed.data.providerId) return { error: FAIL };
  try {
    await withPublicDb((tx) =>
      tx.insert(listingReports).values({
        opportunityId: parsed.data.opportunityId,
        providerId: parsed.data.providerId,
        reason: parsed.data.reason as (typeof listingReports.$inferInsert)["reason"],
        details: parsed.data.details,
        contactEmail: parsed.data.contactEmail,
      }),
    );
  } catch (err) {
    console.error("report insert failed", (err as Error).message);
    return { error: FAIL };
  }
  return { ok: "Thanks. We'll review this listing. Reports are never published automatically." };
}

export async function submitProvider(form: FormData): Promise<IntakeState> {
  const g = await guard(form, "submit");
  if (g === "rate") return { error: RATE };
  if (g) return { ok: g };
  const parsed = submissionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    await withPublicDb((tx) => tx.insert(providerSubmissions).values(parsed.data));
  } catch (err) {
    console.error("submission insert failed", (err as Error).message);
    return { error: FAIL };
  }
  return {
    ok: "Thanks. We review every submission by hand. Listing is never automatic and never paid.",
  };
}
