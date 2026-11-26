import { describe, expect, it } from "vitest";
import { countriesSchema, formToObject, httpsUrlSchema, providerSchema, slugSchema } from "./admin";

describe("httpsUrlSchema", () => {
  it.each(["https://partner.example.com/join?ref=8tasks", "https://www.example.co.uk/a"])(
    "accepts %s",
    (u) => {
      expect(httpsUrlSchema.safeParse(u).success).toBe(true);
    },
  );
  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "https://user:pw@example.com",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://intranet/x",
    "not a url",
    "//example.com",
  ])("rejects %s", (u) => {
    expect(httpsUrlSchema.safeParse(u).success).toBe(false);
  });
});

describe("countriesSchema (launch markets)", () => {
  it("accepts Canada and/or US, deduped and sorted", () => {
    expect(countriesSchema.parse(["US", "CA", "US"])).toEqual(["CA", "US"]);
  });
  it("rejects other countries and empty lists", () => {
    expect(countriesSchema.safeParse(["GB"]).success).toBe(false);
    expect(countriesSchema.safeParse([]).success).toBe(false);
  });
});

describe("slugSchema", () => {
  it("enforces lowercase hyphenated slugs", () => {
    expect(slugSchema.safeParse("survey-junkie").success).toBe(true);
    expect(slugSchema.safeParse("Survey Junkie").success).toBe(false);
    expect(slugSchema.safeParse("bad--slug").success).toBe(false);
  });
});

describe("providerSchema", () => {
  it("parses a submitted form with defaults and empty optionals as null", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      name: "Example Panel",
      slug: "example-panel",
      websiteUrl: "",
      logoUrl: "",
      summary: "",
      description: "",
      status: "draft",
      affiliateNetwork: "",
      supportsSubIds: "unknown",
      supportsPostbacks: "unknown",
      providesFeed: "unknown",
      allowsRevenueShare: "unknown",
      adminNotes: "",
    }))
      fd.set(k, v);
    fd.append("countries", "US");
    const parsed = providerSchema.parse(formToObject(fd, { arrays: ["countries"] }));
    expect(parsed.websiteUrl).toBeNull();
    expect(parsed.summary).toBeNull();
    expect(parsed.countries).toEqual(["US"]);
  });
});
