import { describe, expect, it } from "vitest";
import { earningSchema, earningTotals, profileSchema } from "./account-schemas";

describe("account schemas", () => {
  it("profile keeps only known values", () => {
    const p = profileSchema.parse({
      displayName: "  Sam ",
      country: "CA",
      region: "BC",
      experienceLevel: "new",
      equipment: ["camera"],
    });
    expect(p).toMatchObject({
      displayName: "Sam",
      country: "CA",
      region: "BC",
      experienceLevel: "new",
      equipment: ["camera"],
    });
    expect(profileSchema.safeParse({ equipment: ["drone"] }).success).toBe(false);
  });
  it("earnings totals keep reimbursements and expenses separate from income", () => {
    const e = earningSchema.parse({
      providerName: "P",
      earnedOn: "2026-11-01",
      amount: "25",
      expenses: "5",
      reimbursement: "40",
      status: "received",
    });
    expect(e.amount).toBe(2500);
    const t = earningTotals([
      {
        currency: "USD",
        status: "received",
        amountCents: 2500,
        expensesCents: 500,
        reimbursementCents: 4000,
      },
      {
        currency: "USD",
        status: "expected",
        amountCents: 1000,
        expensesCents: 0,
        reimbursementCents: 0,
      },
      {
        currency: "CAD",
        status: "received",
        amountCents: 700,
        expensesCents: 0,
        reimbursementCents: 0,
      },
    ]);
    expect(t.USD).toEqual({
      expected: 1000,
      received: 2500,
      expenses: 500,
      reimbursements: 4000,
      net: 2000,
    });
    expect(t.CAD.received).toBe(700);
  });
});
