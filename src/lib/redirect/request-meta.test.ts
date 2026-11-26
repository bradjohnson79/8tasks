import { describe, expect, it } from "vitest";
import {
  countryFromHeader,
  deviceTypeFromUA,
  isBotUA,
  sourcePathFromReferer,
} from "./request-meta";

describe("request meta", () => {
  it("keeps only same-origin referer paths", () => {
    expect(
      sourcePathFromReferer(
        "https://8tasks.com/categories/surveys?x=1",
        "https://8tasks.com",
      ),
    ).toBe("/categories/surveys");
    expect(
      sourcePathFromReferer("https://evil.example/x", "https://8tasks.com"),
    ).toBeNull();
    expect(sourcePathFromReferer("not a url", "https://8tasks.com")).toBeNull();
    expect(sourcePathFromReferer(null, "https://8tasks.com")).toBeNull();
  });
  it("classifies devices and bots", () => {
    expect(deviceTypeFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      "mobile",
    );
    expect(deviceTypeFromUA("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceTypeFromUA("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe(
      "desktop",
    );
    expect(isBotUA("Googlebot/2.1")).toBe(true);
    expect(isBotUA(null)).toBe(true);
    expect(isBotUA("Mozilla/5.0 (Macintosh)")).toBe(false);
  });
  it("accepts only ISO-2 country codes", () => {
    expect(countryFromHeader("CA")).toBe("CA");
    expect(countryFromHeader("ca")).toBeNull();
    expect(countryFromHeader("<script>")).toBeNull();
  });
});
