import { parseCsv } from "@/lib/affiliates/csv";
import { DEFAULT_SUBSECTIONS } from "@/lib/discovery/defaults";

/**
 * Adapter for the founder's listings package (`listings_phase1.json` / `.csv`, 2026-11-26):
 *   { affiliate: [...], free_listing_candidates: [...] }  each entry
 *   { listingType, provider, affiliateLinks[], officialLink?, opportunities[], meta }
 * Converts it into the native import shape (provider-import.ts). Rules:
 *  - free listings are always drafts, their official link is stored with is_affiliate=false,
 *    and they never carry pay (compensation stays "unknown");
 *  - affiliate links are stored exactly as given (no SubIDs; fragments and ?ref kept);
 *  - unknown facts are dropped, never guessed.
 * `listings_pending_review.csv` uses a different header and is rejected.
 */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const CAPS = ["unknown", "yes", "no"];
const cap = (v: unknown) => (CAPS.includes(str(v)) ? str(v) : "unknown");

/** "Capture" / "Promote & Earn" → "capture-earn" / "promote-earn". */
export function subsectionSlug(name: string): string | null {
  const n = name
    .toLowerCase()
    .replace(/\s*&\s*earn$/, "")
    .trim();
  return (
    DEFAULT_SUBSECTIONS.find((s) => s.title.toLowerCase().replace(/\s*&\s*earn$/, "") === n)
      ?.slug ?? null
  );
}

export function isListingsPackage(data: unknown): boolean {
  return (
    isObj(data) && (Array.isArray(data.affiliate) || Array.isArray(data.free_listing_candidates))
  );
}

export type ListingsOptions = { includeFree: boolean };

function convert(entry: Obj, free: boolean) {
  const p = isObj(entry.provider) ? entry.provider : {};
  const meta = isObj(entry.meta) ? entry.meta : {};
  const comp = isObj(meta.compensation) ? meta.compensation : {};
  const link = free
    ? isObj(entry.officialLink)
      ? entry.officialLink
      : {}
    : (((entry.affiliateLinks as unknown[]) ?? []).find(isObj) ?? {});
  // Pay is shown only when the package gives display text with a source + verified date.
  const verifiedPay =
    !free && str(comp.display) && str(comp.source_note) && str(comp.last_verified);
  const planned = str(comp.plannedType);
  const compType = !verifiedPay ? "unknown" : planned || str(comp.type) || "unknown";
  const note =
    verifiedPay && compType !== "unknown"
      ? [compType === "licensing_royalties" ? "" : str(comp.display), str(comp.nonCashNote)]
          .filter(Boolean)
          .map((s) => (s.endsWith(".") ? s : `${s}.`))
          .join(" ") || null
      : null;
  const attributes = isObj(meta.attributes)
    ? Object.fromEntries(Object.entries(meta.attributes).filter(([, v]) => typeof v === "boolean"))
    : {};
  if (!free && str(comp.productSupplied) === "sometimes") attributes.productSupplied = true;
  const subsections = strs(meta.createEarnSubsections)
    .map(subsectionSlug)
    .filter((s): s is string => !!s);
  const lastVerified = str(meta.last_verified) || null;

  return {
    slug: str(p.slug),
    listing: {
      type: free ? ("free" as const) : ("affiliate" as const),
      // Free listings are always drafts, whatever the file says.
      status: free
        ? ("draft" as const)
        : str(p.status) === "published"
          ? ("published" as const)
          : ("draft" as const),
    },
    public: {
      name: str(p.name),
      website_url: str(p.websiteUrl) || null,
      summary: str(p.summary) || null,
      // The package appends its old "Free listing: …" sentence; the page shows the disclosure itself.
      description:
        str(p.description).replace(
          /\s*Free listing: 8Tasks has no affiliate relationship[^.]*\.\s*$/,
          "",
        ) || null,
      countries: strs(p.countries),
      last_verified_at: lastVerified,
      affiliate_url: str(link.destinationUrl) || null,
      affiliate_label: str(link.label) || null,
      affiliate_is_affiliate: !free,
      affiliate_notes: str(link.adminNotes) || null,
      opportunities: ((entry.opportunities as unknown[]) ?? []).filter(isObj).map((o) => ({
        slug: str(o.slug),
        title: str(o.title),
        summary: str(o.summary) || null,
        description: str(o.description) || null,
        category: str(o.category),
        subcategory: str(o.subcategory) || null,
        secondary: [],
        subsections,
        pathways: strs(meta.discoveryPathways),
        eligibility: strs(meta.eligibility),
        compensation_type: compType,
        compensation_note: note,
        attributes,
        countries: strs(o.countries).length ? strs(o.countries) : undefined,
        last_verified_at: lastVerified,
      })),
    },
    internal: {
      commission_model: "unknown",
      commission_text: null,
      commission_currency: null,
      qualifying_action: null,
      tracking_window: null,
      recurring_commission: null,
      source_urls: [],
      // Affiliate rows are approved, live programs (package source notes); free rows are Level D
      // "user value" listings with no commission (publish-policy.ts).
      readiness_level: free ? "D" : "A",
      user_value_listing: free,
      approval_status: null,
      mission_alignment: null,
      business_contact: null,
      admin_notes: str(p.adminNotes) || null,
      affiliate_network: str(p.affiliateNetwork) || null,
      capabilities: {
        supports_sub_ids: cap(p.supportsSubIds),
        supports_postbacks: cap(p.supportsPostbacks),
        provides_feed: cap(p.providesFeed),
        allows_revenue_share: cap(p.allowsRevenueShare),
      },
    },
  };
}

export function fromListingsPackage(data: Obj, opts: ListingsOptions) {
  const affiliate = ((data.affiliate as unknown[]) ?? [])
    .filter(isObj)
    .map((e) => convert(e, false));
  const free = opts.includeFree
    ? ((data.free_listing_candidates as unknown[]) ?? []).filter(isObj).map((e) => convert(e, true))
    : [];
  return { providers: [...affiliate, ...free] };
}

/** listings_phase1.csv header (the pending-review CSV is a different file and never imports). */
export function isListingsCsv(csv: string): boolean {
  const head = csv.split(/\r?\n/, 1)[0].toLowerCase();
  return head.includes("listing_type") && head.includes("outbound_url");
}

/** listings_phase1.csv → the package JSON shape (CSV has no descriptions or admin notes). */
export function listingsCsvToPackage(csv: string): Obj {
  const rows = parseCsv(csv);
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const out: { affiliate: Obj[]; free_listing_candidates: Obj[] } = {
    affiliate: [],
    free_listing_candidates: [],
  };
  const list = (v: string) =>
    v
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
  for (const r of rows.slice(1)) {
    if (r.every((c) => !c.trim())) continue;
    const row = Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]));
    const free = row.listing_type !== "affiliate" || row.affiliate !== "true";
    const countries = list(row.countries);
    const linkObj = {
      label: free
        ? "Official website (free listing, no commission)"
        : `${row.provider_name} referral`,
      destinationUrl: row.outbound_url,
    };
    const entry: Obj = {
      listingType: free ? "free_listing" : "affiliate",
      provider: {
        slug: row.provider_slug,
        name: row.provider_name,
        websiteUrl: row.website_url,
        summary: row.summary,
        countries,
        status: row.status,
      },
      ...(free ? { officialLink: linkObj } : { affiliateLinks: [linkObj] }),
      opportunities: [
        {
          slug: row.opportunity_slug,
          title: row.title,
          category: row.category,
          subcategory: row.subcategory,
          summary: row.summary,
          countries,
        },
      ],
      meta: {
        discoveryPathways: list(row.discovery_pathways),
        createEarnSubsections: list(row.create_earn_subsections),
        compensation: {
          display: row.compensation_display,
          source_note: row.compensation_source_note,
          last_verified: row.last_verified,
        },
        last_verified: row.last_verified,
      },
    };
    (free ? out.free_listing_candidates : out.affiliate).push(entry);
  }
  return out;
}
