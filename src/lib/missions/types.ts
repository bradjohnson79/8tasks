/**
 * Display model for anything shown in the discovery feed: specific missions and
 * provider-level opportunities. Built from the database (real listings) or from the
 * isolated demo dataset (src/lib/missions/demo-data.ts, never in production).
 *
 * Unknown facts stay `undefined`. Filters treat undefined as "doesn't match" —
 * missing data never counts as meeting a requirement (design update §14).
 */

export type Currency = "USD" | "CAD";

/**
 * How a listing pays. Only verified terms from the provider may be recorded.
 * Non-cash rewards (gift cards, free products, prizes, other non-cash) and reimbursements
 * are never displayed or sorted as cash.
 */
export type Compensation =
  /** `per` is the unit the amount applies to, e.g. "task", "audio hour", "article". */
  | { type: "fixed"; amount: number; currency: Currency; per?: string }
  | { type: "range"; min: number; max: number; currency: Currency; per?: string }
  | { type: "hourly"; amount: number; currency: Currency }
  | { type: "variable" }
  | {
      type: "reimbursement_only";
      /** What is reimbursed, e.g. "Meal". */
      item: string;
      maxReimbursement?: number;
      currency?: Currency;
    }
  | {
      type: "payment_plus_reimbursement";
      amount: number;
      currency: Currency;
      item: string;
      maxReimbursement?: number;
    }
  | { type: "commission"; recurring: boolean; basis?: "percent" | "flat" }
  | { type: "hybrid"; baseAmount?: number; currency?: Currency }
  | { type: "non_cash"; label: string }
  | { type: "gift_card"; amount?: number; currency?: Currency }
  | { type: "free_product"; label?: string }
  | { type: "competition_prize"; label?: string }
  | { type: "licensing_royalties" }
  | { type: "unknown" };

export type CompensationType = Compensation["type"];

/** Optional yes/no facts. Absent = unknown. */
export type OpportunityAttributes = Partial<{
  /** Can be done from home (online or by phone). */
  remote: boolean;
  /** Done entirely online (computer or phone browser/app). */
  online: boolean;
  inPerson: boolean;
  smartphoneRequired: boolean;
  computerRequired: boolean;
  purchaseRequired: boolean;
  reimbursementAvailable: boolean;
  beginnerFriendly: boolean;
  portfolioRequired: boolean;
  audienceRequired: boolean;
  applicationRequired: boolean;
  assessmentRequired: boolean;
  performanceBased: boolean;
  recurringCommission: boolean;
  /** Done at a specific local place. */
  localAssignment: boolean;
  cameraRequired: boolean;
  /** The brand sends a product (not cash). */
  productSupplied: boolean;
  /** Professional experience or a credential is required. */
  qualificationRequired: boolean;
  writtenDeliverable: boolean;
  videoDeliverable: boolean;
  photoDeliverable: boolean;
  /** Feedback goes privately to the company, not published. */
  privateFeedback: boolean;
  /** The work is published publicly. */
  publicPublication: boolean;
  /** Published content must carry an ad/sponsorship disclosure. */
  sponsorshipDisclosureRequired: boolean;
}>;

export const ATTRIBUTE_KEYS = [
  "remote",
  "online",
  "inPerson",
  "smartphoneRequired",
  "computerRequired",
  "purchaseRequired",
  "reimbursementAvailable",
  "beginnerFriendly",
  "portfolioRequired",
  "audienceRequired",
  "applicationRequired",
  "assessmentRequired",
  "performanceBased",
  "recurringCommission",
  "localAssignment",
  "cameraRequired",
  "productSupplied",
  "qualificationRequired",
  "writtenDeliverable",
  "videoDeliverable",
  "photoDeliverable",
  "privateFeedback",
  "publicPublication",
  "sponsorshipDisclosureRequired",
] as const satisfies readonly (keyof OpportunityAttributes)[];

export type OpportunityLocation = {
  country: "CA" | "US";
  /** Province / state code, e.g. "ON", "TX". */
  region?: string;
  city?: string;
};

export type Opportunity = {
  /** UUID for database listings, "demo-…" for demo items. */
  id: string;
  /** mission = a specific verified assignment; provider = a general earning platform. */
  kind: "mission" | "provider";
  title: string;
  summary?: string;
  description?: string;
  categorySlug: string;
  categoryName: string;
  subcategorySlug?: string;
  providerName: string;
  providerSlug?: string;
  compensation: Compensation;
  /** Short verified note about pay shown on the detail page, e.g. "Some jobs include a free product". */
  compensationNote?: string;
  durationMinutes?: number;
  /** Countries where members are accepted (launch markets only). */
  countries: string[];
  /** Specific places, when the listing is location-bound. */
  locations?: OpportunityLocation[];
  attributes: OpportunityAttributes;
  /** Creator opportunities: follower minimums, platforms, deliverables… (label/value pairs). */
  creatorRequirements?: { label: string; value: string }[];
  whatYouWillDo?: string[];
  eligibility?: string[];
  paymentDetails?: string[];
  terms?: string[];
  isSponsored: boolean;
  /** Unpaid editorial pick. */
  isFeatured?: boolean;
  isDemo: boolean;
  createdAt: string;
  /** Real closing date from the provider (ISO). Absent = ongoing. */
  deadlineAt?: string;
  /** Date (YYYY-MM-DD) an admin last checked this listing or its provider. */
  lastVerifiedAt?: string;
  /** Extra categories/subcategories this record also appears in. */
  secondary?: { categorySlug: string; subcategorySlug?: string }[];
  /** Explicit discovery-group memberships, as "kind:slug". */
  groupKeys?: string[];
  /** Pathway slugs, precomputed from the admin-managed pathways by the loader. */
  pathways?: string[];
  /** Whether a validated outbound affiliate link exists (real listings only). */
  hasOutboundLink: boolean;
};
