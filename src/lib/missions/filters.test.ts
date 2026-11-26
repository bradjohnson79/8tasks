import { describe, expect, it } from "vitest";
import { getDemoOpportunities } from "./demo-data";
import {
  applyDiscovery,
  availableFilters,
  FILTER_BY_ID,
  matchesSearch,
  pathwaysFor,
} from "./filters";
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
    const out = applyDiscovery(demo, {
      category: "content-media",
      subcategories: ["user-generated-content"],
    });
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
