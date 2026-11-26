import { describe, expect, it } from "vitest";
import { getDemoOpportunities } from "./demo-data";
import {
  applyDiscovery,
  availableFilters,
  FILTER_BY_ID,
  matchesSearch,
  pathwaysFor,
} from "./filters";
import { DEFAULT_CATEGORY_TABS, DEFAULT_SUBSECTIONS } from "@/lib/discovery/defaults";
import { belongsTo } from "@/lib/discovery/membership";
import type { Opportunity } from "./types";

const now = new Date("2026-11-26T12:00:00Z");
const demo = getDemoOpportunities(now);
const byId = (id: string) => demo.find((o) => o.id === id)!;
const bare: Opportunity = {
  id: "x",
  kind: "provider",
  title: "Plain listing",
  categorySlug: "surveys",
  categoryName: "Surveys",
  providerName: "P",
  compensation: { type: "unknown" },
  countries: ["US"],
  attributes: {},
  isSponsored: false,
  isDemo: false,
  createdAt: "2020-01-01T00:00:00Z",
  hasOutboundLink: true,
};

describe("filters treat unknown data as not matching", () => {
  it.each([
    "from-home",
    "in-person",
    "under-15",
    "fixed",
    "beginner",
    "no-purchase",
    "no-audience",
    "smartphone-only",
    "nearby",
    "new",
  ])("%s does not match a listing with no data", (id) =>
    expect(FILTER_BY_ID[id].test(bare, { now, location: { country: "US" } })).toBe(false),
  );
});

describe("discovery pathways", () => {
  it("assigns listings to pathways from taxonomy and verified facts", () => {
    expect(pathwaysFor(byId("demo-restaurant-evaluation"))).toContain("local-missions");
    expect(pathwaysFor(byId("demo-music-review"))).toContain("quick-earnings");
    expect(pathwaysFor(byId("demo-ugc-videos"))).toContain("create-earn");
    expect(pathwaysFor(byId("demo-affiliate-program"))).toContain("recurring-income");
    expect(pathwaysFor(bare)).toEqual(["quick-earnings"]); // surveys category belongs to Quick Earnings
  });
});

describe("applyDiscovery", () => {
  it("sorts Highest Paying by verified cash only", () => {
    const out = applyDiscovery(demo, { filters: ["highest-paying"] }, { now });
    expect(out[0].id).toBe("demo-research-study"); // $50–$150 range max
    expect(
      out.every((o) =>
        ["fixed", "range", "hourly", "payment_plus_reimbursement", "hybrid"].includes(
          o.compensation.type,
        ),
      ),
    ).toBe(true);
  });
  it("finds region-level providers and city missions for Nearby", () => {
    const ids = applyDiscovery(
      demo,
      { filters: ["nearby"] },
      { now, location: { country: "US", region: "TX" } },
    ).map((o) => o.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "demo-restaurant-evaluation",
        "demo-car-dealership",
        "demo-shopper-agency",
      ]),
    );
    expect(ids).not.toContain("demo-coffee-shop-visit");
  });
  it("filters by category tab subcategories", () => {
    const ugc = DEFAULT_CATEGORY_TABS.find((t) => t.slug === "ugc")!;
    const out = applyDiscovery(demo, { category: "content-media", group: ugc });
    expect(out.map((o) => o.id)).toEqual(["demo-ugc-videos"]);
  });
  it("disables Nearby without a location and enables it with one", () => {
    expect(availableFilters(demo, { now }).has("nearby")).toBe(false);
    expect(
      availableFilters(demo, { now, location: { country: "CA", region: "ON" } }).has("nearby"),
    ).toBe(true);
  });
});

describe("search", () => {
  it.each([
    ["Get paid to watch videos", "demo-video-review"],
    ["Test mobile apps", "demo-app-test"],
    ["Take photos near me", "demo-retail-display-photo"],
    ["Complete quick surveys", "demo-gift-card-survey"],
    ["Find paid research studies", "demo-research-study"],
  ])("'%s' finds %s", (q, id) => {
    expect(matchesSearch(byId(id), q)).toBe(true);
  });
  it("does not match unrelated listings", () => {
    expect(matchesSearch(byId("demo-car-dealership"), "review music")).toBe(false);
  });
});

describe("demo data", () => {
  it("is always flagged as demo, uses Demo provider names and has no outbound link", () => {
    for (const o of demo) {
      expect(o.isDemo).toBe(true);
      expect(o.hasOutboundLink).toBe(false);
      expect(o.providerName.startsWith("Demo ")).toBe(true);
      expect(o.countries.every((c) => c === "CA" || c === "US")).toBe(true);
    }
  });
});

describe("master prompt filters", () => {
  const day = 86_400_000;
  const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();

  it("New This Week uses a 7-day window", () => {
    const f = FILTER_BY_ID["new"];
    expect(f.label).toBe("New This Week");
    expect(f.test({ ...bare, createdAt: at(-6) }, { now })).toBe(true);
    expect(f.test({ ...bare, createdAt: at(-8) }, { now })).toBe(false);
  });

  it("Ending Soon needs a real deadline within 7 days and never matches ongoing listings", () => {
    const f = FILTER_BY_ID["ending-soon"];
    expect(f.test(bare, { now })).toBe(false);
    expect(f.test({ ...bare, deadlineAt: at(3) }, { now })).toBe(true);
    expect(f.test({ ...bare, deadlineAt: at(10) }, { now })).toBe(false);
    expect(f.test({ ...bare, deadlineAt: at(-1) }, { now })).toBe(false);
  });

  it("expired listings never appear as open in discovery", () => {
    const closed = { ...bare, id: "closed", deadlineAt: at(-1) };
    const open = { ...bare, id: "open", deadlineAt: at(2) };
    const ids = applyDiscovery([closed, open, bare], {}, { now }).map((o) => o.id);
    expect(ids).toEqual(["open", "x"]);
    expect(availableFilters([closed], { now }).has("ending-soon")).toBe(false);
  });

  it("one record can appear in several categories and subsections without duplicates", () => {
    const multi: Opportunity = {
      ...bare,
      id: "multi",
      categorySlug: "content-media",
      subcategorySlug: "user-generated-content",
      secondary: [{ categorySlug: "photography", subcategorySlug: "product-photos" }],
    };
    expect(applyDiscovery([multi], { category: "photography" })).toHaveLength(1);
    expect(applyDiscovery([multi], { category: "content-media" })).toHaveLength(1);
    const capture = DEFAULT_SUBSECTIONS.find((g) => g.slug === "capture-earn")!;
    const film = DEFAULT_SUBSECTIONS.find((g) => g.slug === "film-earn")!;
    expect(belongsTo(multi, capture)).toBe(true);
    expect(belongsTo(multi, film)).toBe(true);
    // Explicit admin membership
    const promote = DEFAULT_SUBSECTIONS.find((g) => g.slug === "promote-earn")!;
    expect(belongsTo(multi, promote)).toBe(false);
    expect(belongsTo({ ...multi, groupKeys: ["subsection:promote-earn"] }, promote)).toBe(true);
  });

  it("category tabs only match subcategories inside their own category", () => {
    const review = DEFAULT_CATEGORY_TABS.find((t) => t.slug === "review")!;
    const elsewhere: Opportunity = {
      ...bare,
      categorySlug: "paid-research",
      subcategorySlug: "consumer-feedback",
    };
    expect(belongsTo(elsewhere, review)).toBe(false);
  });
});

describe("search covers subsections and secondary categories", () => {
  it("finds a UGC listing by 'photograph' (secondary) and 'film' (subsection)", () => {
    const o: Opportunity = {
      ...bare,
      title: "Create UGC for brands",
      categorySlug: "content-media",
      categoryName: "Content & Media",
      secondary: [{ categorySlug: "photography", subcategorySlug: "product-photos" }],
      subsectionTitles: ["Film & Earn"],
    };
    expect(matchesSearch(o, "photograph")).toBe(true);
    expect(matchesSearch(o, "film")).toBe(true);
    expect(matchesSearch(o, "transcription")).toBe(false);
  });
});
