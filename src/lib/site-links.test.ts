import { describe, expect, it } from "vitest";
import { forBrandsOffers, parseSiteLinks, SITE_LINKS } from "./site-links";

describe("site links / For Brands", () => {
  it("lists only live rows placed on the For Brands page", () => {
    const rows = parseSiteLinks([
      {
        provider_id: "joinbrands",
        status: "live",
        affiliate_url: "https://joinbrands.com/?ref=ccIo2N",
        placement: ["directory", "for_brands_page"],
      },
      {
        provider_id: "pending-brand",
        status: "founder_review_pending",
        affiliate_url: "https://x.example.com/?ref=1",
        placement: "directory;for_brands_page",
      },
      {
        provider_id: "sample-brand",
        status: "sample",
        sample_url: "https://y.example.com",
        placement: ["for_brands_page"],
      },
      {
        provider_id: "dreamstime",
        status: "live",
        affiliate_url: "https://www.dreamstime.com/#res62198923",
        placement: ["directory"],
      },
    ]);
    expect(forBrandsOffers(rows).map((r) => r.provider_id)).toEqual(["joinbrands"]);
  });
  it("uses affiliate_url, else sample_url, and never invents a link", () => {
    const rows = parseSiteLinks([
      {
        provider_id: "a",
        status: "live",
        affiliate_url: "",
        sample_url: "https://a.example.com",
        placement: ["for_brands_page"],
      },
      {
        provider_id: "b",
        status: "live",
        affiliate_url: "",
        sample_url: "",
        placement: ["for_brands_page"],
      },
      {
        provider_id: "c",
        status: "live",
        affiliate_url: "javascript:alert(1)",
        placement: ["for_brands_page"],
      },
    ]);
    expect(forBrandsOffers(rows)).toEqual([
      expect.objectContaining({ provider_id: "a", href: "https://a.example.com" }),
    ]);
  });
  it("reads the committed link map: JoinBrands is the For Brands offer with its live ref link", () => {
    expect(forBrandsOffers(SITE_LINKS)).toEqual([
      expect.objectContaining({
        provider_id: "joinbrands",
        href: "https://joinbrands.com/?ref=ccIo2N",
      }),
    ]);
  });
});

describe("full link map (2026-11-25)", () => {
  it("parses every row, keeps commercial terms out of the public copy", async () => {
    const raw = (await import("../../data/site_links.json")).default as { providers: unknown[] };
    expect(SITE_LINKS.length).toBe(raw.providers.length);
    expect(JSON.stringify(raw)).not.toMatch(/commission_note|source_note|"notes"/);
  });
  it("directory rule: sample or live with directory placement; never review-pending or excluded", async () => {
    const { directoryLinks } = await import("./site-links");
    const dir = directoryLinks(SITE_LINKS);
    expect(dir.length).toBe(17);
    expect(dir.every((l) => l.status === "live" || l.status === "sample")).toBe(true);
    expect(forBrandsOffers(SITE_LINKS).map((l) => l.provider_id)).toEqual(["joinbrands"]);
    expect(SITE_LINKS.find((l) => l.provider_id === "joinbrands")?.name).toBe("JoinBrands");
  });
});
