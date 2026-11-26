import { describe, expect, it } from "vitest";
import { shouldShowDemoData } from "./demo";

describe("shouldShowDemoData", () => {
  it("is always off in Vercel production, even if the flag is set", () => {
    expect(
      shouldShowDemoData({ VERCEL_ENV: "production", SHOW_DEMO_DATA: "true" }),
    ).toBe(false);
  });
  it("is on only when explicitly enabled outside production", () => {
    expect(
      shouldShowDemoData({ VERCEL_ENV: "preview", SHOW_DEMO_DATA: "true" }),
    ).toBe(true);
    expect(shouldShowDemoData({ SHOW_DEMO_DATA: "true" })).toBe(true);
    expect(shouldShowDemoData({})).toBe(false);
    expect(shouldShowDemoData({ SHOW_DEMO_DATA: "false" })).toBe(false);
  });
});
