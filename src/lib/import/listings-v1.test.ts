import { describe, expect, it } from "vitest";
import { parseImport } from "./provider-import";
import { subsectionSlug } from "./listings-v1";

// Shape of the founder's listings_phase1.json (the real file holds commercial notes, so it is
// not committed; this fixture keeps only public-safe fields).
const affiliate = {
  listingType: "affiliate",
  provider: {
    slug: "dreamstime",
    name: "Dreamstime",
    websiteUrl: "https://www.dreamstime.com",
    summary: "Stock agency.",
    countries: ["CA", "US"],
    status: "published",
    affiliateNetwork: "Direct",
    supportsSubIds: "unknown",
    adminNotes: "internal only",
  },
  affiliateLinks: [
    {
      label: "Referral",
      destinationUrl: "https://www.dreamstime.com/#res62198923",
      subidParam: null,
    },
  ],
  opportunities: [
    {
      slug: "stock",
      title: "Sell your photos as stock",
      category: "photography",
      subcategory: "product-photos",
      status: "published",
    },
  ],
  meta: {
    discoveryPathways: ["create-earn"],
    createEarnSubsections: ["Capture"],
    compensation: {
      type: "variable",
      plannedType: "licensing_royalties",
      display: "Royalties per licence (varies)",
      source_note: "official pages",
      last_verified: "2026-11-25",
    },
    attributes: { remote: true, applicationRequired: true, madeUp: true },
    last_verified: "2026-11-25",
  },
};
const ugc = {
  ...affiliate,
  provider: { ...affiliate.provider, slug: "joinbrands", name: "JoinBrands" },
  affiliateLinks: [{ label: "Ref", destinationUrl: "https://joinbrands.com/?ref=ccIo2N" }],
  opportunities: [
    {
      slug: "ugc",
      title: "Create videos for brands",
      category: "content-media",
      subcategory: "user-generated-content",
    },
  ],
  meta: {
    ...affiliate.meta,
    createEarnSubsections: ["Film", "Capture"],
    compensation: {
      type: "variable",
      display: "Pay varies by job",
      nonCashNote: "Some jobs include a free product (not cash)",
      productSupplied: "sometimes",
      source_note: "help centre",
      last_verified: "2026-11-25",
    },
  },
};
const free = {
  listingType: "free_listing",
  provider: {
    slug: "prolific",
    name: "Prolific",
    websiteUrl: "https://www.prolific.com",
    countries: ["CA", "US"],
    status: "published", // must be ignored: free listings are always drafts
    adminNotes: "Unverified pay note (do NOT display): £6/h",
  },
  affiliateLinks: [],
  officialLink: {
    label: "Official website",
    destinationUrl: "https://www.prolific.com",
    isAffiliate: false,
  },
  opportunities: [{ slug: "studies", title: "Paid research studies", category: "paid-research" }],
  meta: { compensation: { type: "unknown", display: "£6/hour" }, last_verified: "2026-11-25" },
};
const pkg = JSON.stringify({ affiliate: [affiliate, ugc], free_listing_candidates: [free] });

describe("listings package adapter", () => {
  it("imports only affiliate[] unless free drafts are requested", () => {
    const r = parseImport(pkg, "json");
    expect(r.ok && r.providers.map((p) => p.slug)).toEqual(["dreamstime", "joinbrands"]);
  });

  it("keeps affiliate URLs exactly, maps pay, subsections and known attributes only", () => {
    const r = parseImport(pkg, "json");
    if (!r.ok) throw new Error(r.errors.join());
    const [ds, jb] = r.providers;
    expect(ds.listing).toEqual({ type: "affiliate", status: "published" });
    expect(ds.public.affiliate_url).toBe("https://www.dreamstime.com/#res62198923");
    expect(jb.public.affiliate_url).toBe("https://joinbrands.com/?ref=ccIo2N");
    expect(ds.public.affiliate_is_affiliate).toBe(true);
    expect(ds.internal.readiness_level).toBe("A");
    const o = ds.public.opportunities[0];
    expect(o.compensation_type).toBe("licensing_royalties");
    expect(o.subsections).toEqual(["capture-earn"]);
    expect(o.pathways).toEqual(["create-earn"]);
    expect(o.attributes).toEqual({ remote: true, applicationRequired: true });
    const j = jb.public.opportunities[0];
    expect(j.compensation_type).toBe("variable");
    expect(j.compensation_note).toBe(
      "Pay varies by job. Some jobs include a free product (not cash).",
    );
    expect(j.attributes.productSupplied).toBe(true);
    expect(j.subsections).toEqual(["film-earn", "capture-earn"]);
  });

  it("free listings: draft, non-affiliate official link, no pay, Level D user-value", () => {
    const r = parseImport(pkg, "json", { includeFree: true });
    if (!r.ok) throw new Error(r.errors.join());
    const f = r.providers.find((p) => p.slug === "prolific")!;
    expect(f.listing).toEqual({ type: "free", status: "draft" });
    expect(f.public.affiliate_url).toBe("https://www.prolific.com");
    expect(f.public.affiliate_is_affiliate).toBe(false);
    expect(f.public.opportunities[0].compensation_type).toBe("unknown");
    expect(f.public.opportunities[0].compensation_note).toBeNull();
    expect(f.internal).toMatchObject({ readiness_level: "D", user_value_listing: true });
  });

  it("parses the listings CSV and never accepts the pending-review CSV", () => {
    const csv = [
      "group,listing_type,affiliate,provider_slug,provider_name,status,opportunity_slug,title,category,subcategory,discovery_pathways,create_earn_subsections,outbound_url,website_url,countries,summary,compensation_display,compensation_source_note,label,disclosure,last_verified,source_note,sponsored,is_demo",
      "phase1b_free_candidate,free_listing,false,userbrain,Userbrain,published,test-websites,Test websites,app-website-testing,,,,https://www.userbrain.com,https://www.userbrain.com,CA;US,Test sites.,,,Free listing,,2026-11-25,,false,false",
    ].join("\n");
    const r = parseImport(csv, "csv", { includeFree: true });
    if (!r.ok) throw new Error(r.errors.join());
    expect(r.providers[0].listing).toEqual({ type: "free", status: "draft" });
    expect(r.providers[0].public.affiliate_is_affiliate).toBe(false);
    const pending = "provider_id,name,reason\nfoo,Foo,US only\n";
    expect(parseImport(pending, "csv").ok).toBe(false);
  });

  it("maps subsection names", () => {
    expect(subsectionSlug("Promote & Earn")).toBe("promote-earn");
    expect(subsectionSlug("Film")).toBe("film-earn");
    expect(subsectionSlug("Nope")).toBeNull();
  });
});
