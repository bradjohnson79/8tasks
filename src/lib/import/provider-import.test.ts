import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CSV_IMPORT_COLUMNS, parseImport } from "./provider-import";

const pkg = readFileSync(
  join(process.cwd(), "data/import/claude_integration_package.json"),
  "utf8",
);

const native = {
  providers: [
    {
      slug: "example-co",
      public: {
        name: "Example Co",
        countries: ["CA"],
        affiliate_url: "https://example.com/?ref=1",
        opportunities: [{ slug: "tasks", title: "Example tasks", category: "surveys" }],
      },
    },
  ],
};

describe("founder integration package (adapter)", () => {
  it("maps both providers, keeps exact affiliate URLs and never invents facts", () => {
    const r = parseImport(pkg, "json");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [ds, jb] = r.providers;
    expect(ds.slug).toBe("dreamstime");
    expect(ds.public.affiliate_url).toBe("https://www.dreamstime.com/#res62198923");
    expect(jb.public.affiliate_url).toBe("https://joinbrands.com/?ref=ccIo2N");
    expect(jb.public.countries).toEqual(["CA", "US"]);
    const dso = ds.public.opportunities[0];
    // "stock-licensing (NEW — add)" and "licensing_royalties (NEW — …)" annotations are stripped.
    expect(dso.subcategory).toBe("product-photos");
    expect(dso.secondary).toEqual(
      expect.arrayContaining([
        { category: "content-media", subcategory: null },
        { category: "photography", subcategory: "stock-licensing" },
      ]),
    );
    expect(dso.compensation_type).toBe("licensing_royalties");
    expect(dso.subsections).toEqual(["capture-earn"]);
    expect(dso.pathways).toEqual(["create-earn"]);
    // Only true/false facts survive; null, "sometimes" and "job-dependent" are unknown.
    expect(dso.attributes).toEqual({
      remote: true,
      applicationRequired: true,
      photoDeliverable: true,
      purchaseRequired: false,
    });
    const jbo = jb.public.opportunities[0];
    expect(jbo.attributes).not.toHaveProperty("productSupplied");
    expect(jbo.compensation_note).toMatch(/free product \(not cash\)/);
    expect(jbo.subsections).toEqual(["film-earn", "capture-earn", "review-earn"]);
    expect(jbo.eligibility[0]).toMatch(/18\+/);
    expect(jb.internal.capabilities?.provides_feed).toBe("no");
    expect(jb.internal.admin_notes).toMatch(/Do not display individual brands/);
  });
});

describe("native import format", () => {
  it("rejects unsupported countries, non-https URLs and duplicate slugs", () => {
    const bad = structuredClone(native);
    bad.providers[0].public.countries = ["GB"];
    expect(parseImport(JSON.stringify(bad), "json").ok).toBe(false);
    const http = structuredClone(native);
    http.providers[0].public.affiliate_url = "http://example.com/x";
    expect(parseImport(JSON.stringify(http), "json").ok).toBe(false);
    const dup = { providers: [native.providers[0], native.providers[0]] };
    expect(parseImport(JSON.stringify(dup), "json").ok).toBe(false);
  });

  it("drops unknown attribute keys and ignores any status field", () => {
    const base = structuredClone(native) as unknown as {
      providers: {
        public: Record<string, unknown> & { opportunities: Record<string, unknown>[] };
      }[];
    };
    base.providers[0].public.status = "published";
    base.providers[0].public.opportunities[0].status = "published";
    base.providers[0].public.opportunities[0].attributes = { remote: true, madeUp: true };
    const r = parseImport(JSON.stringify(base), "json");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(r.providers)).not.toContain("published");
    expect(r.providers[0].public.opportunities[0].attributes).toEqual({ remote: true });
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
