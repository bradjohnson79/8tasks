"use server";

import { inArray } from "drizzle-orm";
import { affiliateLinks, opportunities } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { applyProviders, importLookups as lookups } from "@/lib/import/apply";
import { parseImport } from "@/lib/import/provider-import";

/**
 * Admin-only provider import (master prompt §3.1). Validate → preview diff → apply.
 * New records are drafts (listings-package affiliate rows marked published are the exception,
 * gated by the publish policy). Existing records keep their status and admin notes.
 */
export type ImportPreviewRow = {
  slug: string;
  name: string;
  action: "create" | "update";
  wasPublished: boolean;
  changes: string[];
  opportunities: { slug: string; title: string; action: "create" | "update" }[];
  newAffiliateLink: boolean;
  listingType?: "affiliate" | "free";
  statusAfter: string;
};
export type ImportState =
  | {
      stage: "preview";
      rows: ImportPreviewRow[];
      raw: string;
      format: "json" | "csv";
      includeFree: boolean;
      publishAffiliate: boolean;
    }
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
  return {
    raw,
    format,
    includeFree: form.get("includeFree") === "on",
    publishAffiliate: form.get("publishAffiliate") === "on",
  };
}

export async function previewImport(_prev: ImportState, form: FormData): Promise<ImportState> {
  const { db } = await requireAdmin();
  const input = await readInput(form);
  if ("error" in input) return { stage: "error", errors: [input.error!] };
  const parsed = parseImport(input.raw, input.format, { includeFree: input.includeFree });
  if (!parsed.ok) return { stage: "error", errors: parsed.errors };
  const l = await lookups(db, parsed.providers);
  if (l.errors.length) return { stage: "error", errors: l.errors.slice(0, 20) };

  const ids = l.existing.map((p) => p.id);
  const [existingOpps, links] = await Promise.all([
    ids.length
      ? db
          .select({
            providerId: opportunities.providerId,
            slug: opportunities.slug,
            categoryId: opportunities.categoryId,
          })
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
    const wantsPublish = p.listing?.type === "affiliate" && p.listing.status === "published";
    const statusAfter =
      wantsPublish && (!cur || input.publishAffiliate)
        ? "published (if the publish policy allows)"
        : cur
          ? `${cur.status} (unchanged)`
          : "draft";
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
        // Same rule as apply.ts: a renamed slug adopts the provider's listing in that category.
        action: existingOpps.some(
          (e) =>
            e.providerId === cur?.id &&
            (e.slug === o.slug ||
              (e.categoryId === l.catId(o.category) &&
                !p.public.opportunities.some((x) => x.slug === e.slug))),
        )
          ? "update"
          : "create",
      })),
      newAffiliateLink:
        !!p.public.affiliate_url &&
        !links.some((x) => x.providerId === cur?.id && x.url === p.public.affiliate_url),
      listingType: p.listing?.type,
      statusAfter,
    };
  });
  return {
    stage: "preview",
    rows,
    raw: input.raw,
    format: input.format,
    includeFree: input.includeFree,
    publishAffiliate: input.publishAffiliate,
  };
}

export async function applyImport(_prev: ImportState, form: FormData): Promise<ImportState> {
  const { session, db } = await requireAdmin();
  const input = await readInput(form);
  if ("error" in input) return { stage: "error", errors: [input.error!] };
  const parsed = parseImport(input.raw, input.format, { includeFree: input.includeFree });
  if (!parsed.ok) return { stage: "error", errors: parsed.errors };
  const l = await lookups(db, parsed.providers);
  if (l.errors.length) return { stage: "error", errors: l.errors.slice(0, 20) };

  let counts;
  try {
    counts = await db.transaction((tx) =>
      applyProviders(tx, parsed.providers, l, session.user.id, {
        publishAffiliate: input.publishAffiliate,
      }),
    );
  } catch (err) {
    console.error(err);
    return { stage: "error", errors: ["Import failed. Nothing was changed."] };
  }
  const { created, updated, opps, published, blocked } = counts;
  return {
    stage: "done",
    message:
      `Imported ${created} new and ${updated} updated providers, ${opps} opportunities; ${published} records published. ` +
      (blocked.length ? `Not published: ${blocked.join("; ")}. ` : "") +
      "Everything else is a draft or kept its existing status.",
  };
}
