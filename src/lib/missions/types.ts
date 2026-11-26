/**
 * Display model for anything shown in the discovery feed: specific missions and
 * provider-level opportunities. Built from the database (real listings) or from the
 * isolated demo dataset (src/lib/missions/demo-data.ts, never in production).
 *
 * Unknown facts stay `undefined`. Filters treat undefined as "doesn't match" —
 * missing data never counts as meeting a requirement (design update §14).
 */

export type Currency = "USD" | "CAD";

/** How a listing pays. Only verified terms from the provider may be recorded. */
export type Compensation =
  | { type: "fixed"; amount: number; currency: Currency }
  | { type: "range"; min: number; max: number; currency: Currency }
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
  | { type: "commission"; recurring: boolean }
  | { type: "hybrid"; baseAmount?: number; currency?: Currency }
  | { type: "non_cash"; label: string }
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
}>;

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
  isDemo: boolean;
  createdAt: string;
  /** Whether a validated outbound affiliate link exists (real listings only). */
  hasOutboundLink: boolean;
};
