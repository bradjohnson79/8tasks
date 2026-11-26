import { describe, expect, it } from "vitest";
import { providerPublishBlocker } from "./publish-policy";

describe("provider publish policy", () => {
  it("publishes Level A, blocks unset/B/C/E", () => {
    expect(
      providerPublishBlocker({
        readinessLevel: "A",
        userValueListing: false,
        activeAffiliateLinks: 1,
      }),
    ).toBeNull();
    for (const r of [null, "B", "C", "E"])
      expect(
        providerPublishBlocker({
          readinessLevel: r,
          userValueListing: true,
          activeAffiliateLinks: 0,
        }),
      ).toMatch(/readiness/);
  });
  it("Level D only as a flagged user-value listing without affiliate links", () => {
    expect(
      providerPublishBlocker({
        readinessLevel: "D",
        userValueListing: false,
        activeAffiliateLinks: 0,
      }),
    ).toMatch(/user-value/);
    expect(
      providerPublishBlocker({
        readinessLevel: "D",
        userValueListing: true,
        activeAffiliateLinks: 1,
      }),
    ).toMatch(/affiliate links/);
    expect(
      providerPublishBlocker({
        readinessLevel: "D",
        userValueListing: true,
        activeAffiliateLinks: 0,
      }),
    ).toBeNull();
  });
});
