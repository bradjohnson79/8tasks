import { describe, expect, it } from "vitest";
import { checkAdmin } from "./admin-policy";

describe("checkAdmin", () => {
  it("rejects missing sessions", () => expect(checkAdmin(null)).toBe("unauthenticated"));
  it("rejects non-admins and banned admins", () => {
    expect(checkAdmin({ role: "user", twoFactorEnabled: true })).toBe("not_admin");
    expect(checkAdmin({ role: "admin", twoFactorEnabled: true, banned: true })).toBe("not_admin");
  });
  it("requires MFA for admins", () =>
    expect(checkAdmin({ role: "admin", twoFactorEnabled: false })).toBe("mfa_required"));
  it("allows admins with MFA", () =>
    expect(checkAdmin({ role: "admin", twoFactorEnabled: true })).toBeNull());
});
