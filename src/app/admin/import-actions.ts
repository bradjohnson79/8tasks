"use server";

import { inArray } from "drizzle-orm";
import { affiliateLinks, opportunities } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { applyProviders, importLookups as lookups } from "@/lib/import/apply";
import { parseImport } from "@/lib/import/provider-import";

/**
 * Admin-only provider import (master prompt §3.1). Validate → preview diff → apply.
 * Every imported provider and opportunity is written as status = draft.
 */
export type ImportPreviewRow = {
  slug: string;
  name: string;
  action: "create" | "update";
  wasPublished: boolean;
  changes: string[];
  opportunities: { slug: string; title: string; action: "create" | "update" }[];
  newAffiliateLink: boolean;
};
export type ImportState =
  | { stage: "preview"; rows: ImportPreviewRow[]; raw: string; format: "json" | "csv" }
  | { stage: "done"; message: string }
  | { stage: "error"; errors: string[] }
  | undefined;

const MAX_BYTES = 1_000_000;

async function readInput(form: FormData) {
  const format: "json" | "csv" = form.get("format") === "csv" ? "csv" : "json";
  const file = form.get("file");
  let raw = String(form.get("raw") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { error: "File is larger than 1 MB." };
    raw = await file.text();
  }
  if (!raw.trim()) return { error: "Choose a file or paste the data." };
  if (raw.length > MAX_BYTES) return { error: "Data is larger than 1 MB." };
  return { raw, format };
}

export async function previewImport(_prev: ImportState, form: FormData): Promise<ImportState> {
  const { db } = await requireAdmin();
  const input = await readInput(form);
  if ("error" in input) return { stage: "error", errors: [input.error!] };
  const parsed = parseImport(input.raw, input.format);
  if (!parsed.ok) return { stage: "error", errors: parsed.errors };
  const l = await lookups(db, parsed.providers);
  if (l.errors.length) return { stage: "error", errors: l.errors.slice(0, 20) };

  const ids = l.existing.map((p) => p.id);
  const [existingOpps, links] = await Promise.all([
    ids.length
      ? db
          .select({ providerId: opportunities.providerId, slug: opportunities.slug })
          .from(opportunities)
          .where(inArray(opportunities.providerId, ids))
      : [],
    ids.length
      ? db
          .select({ providerId: affiliateLinks.providerId, url: affiliateLinks.destinationUrl })
          .from(affiliateLinks)
          .where(inArray(affiliateLinks.providerId, ids))
      : [],
  ]);

  const rows: ImportPreviewRow[] = parsed.providers.map((p) => {
    const cur = l.existing.find((e) => e.slug === p.slug);
    const changes: string[] = [];
    if (cur) {
      const cmp: [string, unknown, unknown][] = [
        ["name", cur.name, p.public.name],
        ["website", cur.websiteUrl, p.public.website_url],
        ["summary", cur.summary, p.public.summary],
        ["description", cur.description, p.public.description],
        ["countries", cur.countries.join(","), [...p.public.countries].sort().join(",")],
        ["last verified", cur.lastVerifiedAt, p.public.last_verified_at],
      ];
      for (const [f, a, b] of cmp) if ((a ?? null) !== (b ?? null)) changes.push(f);
    }
    return {
      slug: p.slug,
      name: p.public.name,
      action: cur ? "update" : "create",
      wasPublished: cur?.status === "published",
      changes,
      opportunities: p.public.opportunities.map((o) => ({
        slug: o.slug,
        title: o.title,
        action: existingOpps.some((e) => e.providerId === cur?.id && e.slug === o.slug)
          ? "update"
          : "create",
      })),
      newAffiliateLink:
        !!p.public.affiliate_url &&
        !links.some((x) => x.providerId === cur?.id && x.url === p.public.affiliate_url),
    };
  });
  return { stage: "preview", rows, raw: input.raw, format: input.format };
}

export async function applyImport(_prev: ImportState, form: FormData): Promise<ImportState> {
  const { session, db } = await requireAdmin();
  const input = await readInput(form);
  if ("error" in input) return { stage: "error", errors: [input.error!] };
  const parsed = parseImport(input.raw, input.format);
  if (!parsed.ok) return { stage: "error", errors: parsed.errors };
  const l = await lookups(db, parsed.providers);
  if (l.errors.length) return { stage: "error", errors: l.errors.slice(0, 20) };

  let counts;
  try {
    counts = await db.transaction((tx) => applyProviders(tx, parsed.providers, l, session.user.id));
  } catch (err) {
    console.error(err);
    return { stage: "error", errors: ["Import failed. Nothing was changed."] };
  }
  const { created, updated, opps } = counts;
  return {
    stage: "done",
    message: `Imported as drafts: ${created} new and ${updated} updated providers, ${opps} opportunities. Review and publish them by hand.`,
  };
}
