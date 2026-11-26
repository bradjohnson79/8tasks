import { describe, expect, it } from "vitest";
import { withSubId } from "./subid";

const id = "123e4567-e89b-12d3-a456-426614174000";

describe("withSubId", () => {
  it("leaves direct links untouched (no param configured)", () => {
    expect(withSubId("https://joinbrands.com/?ref=ccIo2N", null, id)).toBe(
      "https://joinbrands.com/?ref=ccIo2N",
    );
    expect(withSubId("https://www.dreamstime.com/#res62198923", null, id)).toBe(
      "https://www.dreamstime.com/#res62198923",
    );
  });
  it("appends a documented param with an alphanumeric click id", () => {
    expect(withSubId("https://x.example.com/c/1?a=b", "subId1", id)).toBe(
      "https://x.example.com/c/1?a=b&subId1=123e4567e89b12d3a456426614174000",
    );
  });
  it("ignores undocumented params", () => {
    expect(withSubId("https://x.example.com/", "email", id)).toBe("https://x.example.com/");
  });
  it("preserves URL fragments exactly (Dreamstime's #res link)", () => {
    expect(withSubId("https://www.dreamstime.com/#res62198923", null, id)).toBe(
      "https://www.dreamstime.com/#res62198923",
    );
    // Even with a SubID param, the fragment stays at the end, unchanged.
    expect(withSubId("https://x.example.com/p?a=b#res62198923", "subId1", id)).toBe(
      "https://x.example.com/p?a=b&subId1=123e4567e89b12d3a456426614174000#res62198923",
    );
  });
});
