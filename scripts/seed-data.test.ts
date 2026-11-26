import { describe, expect, it } from "vitest";
import { CATEGORY_SEED, DEMO_PROVIDERS } from "./seed-data";

describe("seed data", () => {
  it("has exactly 8 categories with unique slugs", () => {
    expect(CATEGORY_SEED).toHaveLength(8);
    expect(new Set(CATEGORY_SEED.map((c) => c.slug)).size).toBe(8);
  });
  it("demo providers use reserved example.com domains and say they are demos", () => {
    for (const p of DEMO_PROVIDERS) {
      for (const url of [p.provider.websiteUrl, p.linkUrl]) {
        expect(new URL(url).hostname.endsWith(".example.com")).toBe(true);
      }
      expect(p.provider.name.startsWith("Demo ")).toBe(true);
      expect(p.provider.summary).toMatch(/not a real provider/i);
    }
  });
  it("demo content contains no payout or earnings claims", () => {
    const text = JSON.stringify(DEMO_PROVIDERS);
    expect(text).not.toMatch(/\$|€|£|earn up to|per hour|guaranteed/i);
  });
});

describe("category merges", () => {
  it("uses the founder's 8 categories and every retired slug maps to one of them", async () => {
    const { RETIRED_CATEGORIES, MOVED_SUBCATEGORIES } = await import("./seed-data");
    const slugs = CATEGORY_SEED.map((c) => c.slug);
    expect(slugs).toEqual([
      "surveys", "app-website-testing", "photography", "mystery-shopping",
      "content-media", "gaming-entertainment", "paid-research", "microtasks-ai",
    ]);
    for (const [oldSlug, target] of Object.entries(RETIRED_CATEGORIES)) {
      expect(slugs).not.toContain(oldSlug);
      expect(slugs).toContain(target);
    }
    for (const m of MOVED_SUBCATEGORIES) {
      const to = CATEGORY_SEED.find((c) => c.slug === m.to);
      expect(to?.subcategories.map((s) => s.slug)).toContain(m.slug);
    }
  });
});
