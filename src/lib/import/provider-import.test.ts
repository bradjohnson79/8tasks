import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CSV_IMPORT_COLUMNS, parseImport } from "./provider-import";

const pkg = readFileSync(
  join(process.cwd(), "data/import/claude_integration_package.json"),
  "utf8",
);

describe("provider import parsing", () => {
  it("accepts the integration package and keeps exact affiliate URLs", () => {
    const r = parseImport(pkg, "json");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.providers.map((p) => p.slug)).toEqual(["dreamstime", "joinbrands"]);
    expect(r.providers[0].public.affiliate_url).toBe("https://www.dreamstime.com/#res62198923");
    expect(r.providers[1].public.affiliate_url).toBe("https://joinbrands.com/?ref=ccIo2N");
    expect(r.providers[1].public.opportunities[0].subsections).toContain("film-earn");
  });

  it("rejects unsupported countries, non-https URLs and duplicate slugs", () => {
    const base = JSON.parse(pkg);
    const bad = structuredClone(base);
    bad.providers[0].public.countries = ["GB"];
    expect(parseImport(JSON.stringify(bad), "json").ok).toBe(false);
    const http = structuredClone(base);
    http.providers[0].public.affiliate_url = "http://example.com/x";
    expect(parseImport(JSON.stringify(http), "json").ok).toBe(false);
    const dup = structuredClone(base);
    dup.providers[1].slug = "dreamstime";
    const r = parseImport(JSON.stringify(dup), "json");
    expect(r.ok).toBe(false);
  });

  it("drops unknown attribute keys and has no status field to set", () => {
    const base = JSON.parse(pkg);
    base.providers[0].public.status = "published";
    base.providers[0].public.opportunities[0].status = "published";
    base.providers[0].public.opportunities[0].attributes.madeUp = true;
    const r = parseImport(JSON.stringify(base), "json");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(r.providers)).not.toContain("published");
    expect(r.providers[0].public.opportunities[0].attributes).not.toHaveProperty("madeUp");
  });

  it("parses the equivalent CSV into the same structure", () => {
    const header = CSV_IMPORT_COLUMNS.join(",");
    const row = (o: Record<string, string>) =>
      CSV_IMPORT_COLUMNS.map((c) => JSON.stringify(o[c] ?? "")).join(",");
    const csv = [
      header,
      row({
        slug: "joinbrands",
        name: "JoinBrands",
        countries: "US",
        affiliate_url: "https://joinbrands.com/?ref=ccIo2N",
        opportunity_slug: "ugc-creator-jobs",
        opportunity_title: "Create UGC for brands",
        category: "content-media",
        subcategory: "user-generated-content",
        secondary: "photography/product-photos",
        subsections: "film-earn;capture-earn",
        compensation_type: "variable",
        attributes: "productSupplied=yes;remote=yes",
        commission_model: "business_client_referral",
        recurring_commission: "yes",
      }),
    ].join("\n");
    const r = parseImport(csv, "csv");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = r.providers[0].public.opportunities[0];
    expect(o.secondary).toEqual([{ category: "photography", subcategory: "product-photos" }]);
    expect(o.attributes).toEqual({ productSupplied: true, remote: true });
    expect(r.providers[0].internal.recurring_commission).toBe(true);
  });
});
