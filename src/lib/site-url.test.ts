import { describe, expect, it } from "vitest";
import { resolveSiteUrls } from "./site-url";

describe("resolveSiteUrls", () => {
  it("prefers an explicit BETTER_AUTH_URL", () => {
    expect(resolveSiteUrls({ BETTER_AUTH_URL: "http://localhost:3000" })).toEqual({
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  });
  it("uses the branch URL on Vercel previews and trusts the deployment URL too", () => {
    const r = resolveSiteUrls({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "8tasks-git-feature-x.vercel.app",
      VERCEL_URL: "8tasks-abc123.vercel.app",
    });
    expect(r.baseURL).toBe("https://8tasks-git-feature-x.vercel.app");
    expect(r.trustedOrigins).toContain("https://8tasks-abc123.vercel.app");
  });
  it("throws when nothing is configured", () => {
    expect(() => resolveSiteUrls({})).toThrow();
  });
});
