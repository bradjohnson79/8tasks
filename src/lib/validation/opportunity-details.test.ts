import { describe, expect, it } from "vitest";
import { opportunityDetailsSchema } from "./admin";

const base = { commissionRecurring: false, isFeatured: false };
const errors = (input: Record<string, unknown>) =>
  opportunityDetailsSchema.safeParse({ ...base, ...input }).error?.issues.map((i) => i.message) ??
  [];

describe("opportunity compensation validation", () => {
  it("requires verified amounts and currency for cash types", () => {
    expect(errors({ compensationType: "fixed", payMin: "5" })).toEqual(["Choose the currency"]);
    expect(
      errors({ compensationType: "range", payMin: "50", payMax: "10", currency: "USD" }),
    ).toEqual(["Minimum must not exceed maximum"]);
    expect(errors({ compensationType: "reimbursement_only" })).toEqual([
      "Say what is reimbursed (e.g. Meal)",
    ]);
  });
  it("needs nothing for unknown or non-cash types except a label for generic non-cash", () => {
    expect(errors({ compensationType: "unknown" })).toEqual([]);
    expect(errors({ compensationType: "free_product" })).toEqual([]);
    expect(errors({ compensationType: "non_cash" })).toEqual(["Describe the non-cash reward"]);
  });
  it("stores cents and closes deadlines at the end of the day in Vancouver", () => {
    const d = opportunityDetailsSchema.parse({
      ...base,
      compensationType: "fixed",
      payMin: "12.50",
      currency: "CAD",
      deadlineDate: "2026-12-31",
    });
    expect(d.payMinCents).toBe(1250);
    expect(d.deadlineAt?.toISOString()).toBe("2027-01-01T06:59:59.000Z");
  });
});
