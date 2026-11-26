import "server-only";
import { cache } from "react";
import { getOpportunityLinks, getPublicOpportunityRows } from "@/db/queries/public";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { shouldShowDemoData } from "@/lib/demo";
import { getDemoOpportunities } from "./demo-data";
import { pathwaysFor } from "./filters";
import { ATTRIBUTE_KEYS, type Compensation, type Currency, type Opportunity } from "./types";

type Row = Awaited<ReturnType<typeof getPublicOpportunityRows>>[number];

const dollars = (cents: number | null) => (cents == null ? undefined : cents / 100);

/**
 * Builds the display compensation from the verified DB columns. Any missing required
 * value falls back to "unknown" (rendered "See provider details") rather than guessing.
 */
export function compensationFromRow(r: {
  compensationType: Row["compensationType"];
  payMinCents: number | null;
  payMaxCents: number | null;
  currency: string | null;
  payPeriod: string | null;
  commissionBasis: Row["commissionBasis"];
  commissionRecurring: boolean | null;
  reimbursementItem: string | null;
  reimbursementMaxCents: number | null;
  compensationNote: string | null;
}): Compensation {
  const cur = (r.currency === "USD" || r.currency === "CAD" ? r.currency : undefined) as
    Currency | undefined;
  const min = dollars(r.payMinCents);
  const max = dollars(r.payMaxCents);
  const per = r.payPeriod ?? undefined;
  const unknown: Compensation = { type: "unknown" };
  switch (r.compensationType) {
    case "fixed":
      return min !== undefined && cur
        ? { type: "fixed", amount: min, currency: cur, per }
        : unknown;
    case "range":
      return min !== undefined && max !== undefined && cur
        ? { type: "range", min, max, currency: cur, per }
        : unknown;
    case "hourly":
      return min !== undefined && cur ? { type: "hourly", amount: min, currency: cur } : unknown;
    case "variable":
      return { type: "variable" };
    case "reimbursement_only":
      return r.reimbursementItem
        ? {
            type: "reimbursement_only",
            item: r.reimbursementItem,
            maxReimbursement: dollars(r.reimbursementMaxCents),
            currency: cur,
          }
        : unknown;
    case "payment_plus_reimbursement":
      return min !== undefined && cur && r.reimbursementItem
        ? {
            type: "payment_plus_reimbursement",
            amount: min,
            currency: cur,
            item: r.reimbursementItem,
            maxReimbursement: dollars(r.reimbursementMaxCents),
          }
        : unknown;
    case "commission":
      return {
        type: "commission",
        recurring: r.commissionRecurring === true,
        basis: r.commissionBasis ?? undefined,
      };
    case "hybrid":
      return { type: "hybrid", baseAmount: min, currency: cur };
    case "non_cash":
      return r.compensationNote ? { type: "non_cash", label: r.compensationNote } : unknown;
    case "gift_card":
      return { type: "gift_card", amount: min, currency: cur };
    case "free_product":
      return { type: "free_product" };
    case "competition_prize":
      return { type: "competition_prize" };
    case "licensing_royalties":
      return { type: "licensing_royalties" };
    default:
      return unknown;
  }
}

function attributesFrom(raw: Record<string, unknown>): Opportunity["attributes"] {
  const out: Opportunity["attributes"] = {};
  for (const k of ATTRIBUTE_KEYS) if (typeof raw?.[k] === "boolean") out[k] = raw[k] as boolean;
  return out;
}

const nonEmpty = (a: string[]) => (a.length ? a : undefined);

/**
 * The discovery feed: real published listings from the database, plus the isolated
 * demo dataset when (and only when) demo data is allowed. In production the demo
 * dataset is never loaded (shouldShowDemoData() is false when VERCEL_ENV=production).
 */
export const loadOpportunities = cache(async (): Promise<Opportunity[]> => {
  const showDemo = shouldShowDemoData();
  const [rows, links, config] = await Promise.all([
    getPublicOpportunityRows(),
    getOpportunityLinks(),
    getDiscoveryConfig(),
  ]);
  const real: Opportunity[] = rows
    // Older seeded demo rows are superseded by the richer demo dataset below.
    .filter((r) => !r.isDemo)
    .map((r) => {
      const isNonCashNote = r.compensationType === "non_cash" || r.compensationType === "unknown";
      return {
        id: r.id,
        kind: r.dataSource === "provider_level" ? "provider" : "mission",
        title: r.title,
        summary: r.summary ?? undefined,
        description: r.description ?? undefined,
        categorySlug: r.categorySlug,
        categoryName: r.categoryName,
        subcategorySlug: r.subcategorySlug ?? undefined,
        providerName: r.providerName,
        providerSlug: r.providerSlug,
        compensation: compensationFromRow(r),
        compensationNote: !isNonCashNote ? (r.compensationNote ?? undefined) : undefined,
        durationMinutes: r.estimatedMinutes ?? undefined,
        countries: r.countries,
        attributes: attributesFrom(r.attributes),
        whatYouWillDo: nonEmpty(r.whatYouWillDo),
        eligibility: nonEmpty(r.eligibility),
        paymentDetails: nonEmpty(r.paymentDetails),
        isSponsored: r.isSponsored,
        isFeatured: r.isFeatured,
        isDemo: false,
        createdAt: r.createdAt.toISOString(),
        deadlineAt: r.deadlineAt?.toISOString(),
        lastVerifiedAt: r.lastVerifiedAt ?? undefined,
        secondary: links.secondary
          .filter((s) => s.opportunityId === r.id)
          .map((s) => ({
            categorySlug: s.categorySlug,
            subcategorySlug: s.subcategorySlug ?? undefined,
          })),
        groupKeys: links.groups
          .filter((g) => g.opportunityId === r.id)
          .map((g) => `${g.kind}:${g.slug}`),
        hasOutboundLink: r.hasLink,
      } satisfies Opportunity;
    });
  const all = showDemo ? [...real, ...getDemoOpportunities()] : real;
  return all.map((o) => ({ ...o, pathways: pathwaysFor(o, config.pathways) }));
});

export async function loadOpportunity(id: string): Promise<Opportunity | undefined> {
  return (await loadOpportunities()).find((o) => o.id === id);
}
