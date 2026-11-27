import { describe, expect, it } from "vitest";
import { formatCompensation, sortableAmount } from "./compensation";

describe("formatCompensation", () => {
  it("formats fixed, range and hourly amounts", () => {
    expect(formatCompensation({ type: "fixed", amount: 25, currency: "USD" })).toMatchObject({
      primary: "$25",
      unit: "USD",
      isAmount: true,
    });
    expect(formatCompensation({ type: "range", min: 50, max: 150, currency: "USD" }).primary).toBe(
      "$50–$150",
    );
    expect(formatCompensation({ type: "hourly", amount: 20, currency: "USD" })).toMatchObject({
      primary: "$20",
      unit: "/hour",
    });
  });
  it("never adds reimbursement to cash pay", () => {
    const d = formatCompensation({
      type: "payment_plus_reimbursement",
      amount: 25,
      currency: "USD",
      item: "Meal",
      maxReimbursement: 40,
    });
    expect(d.primary).toBe("$25");
    expect(d.secondary).toBe("+ meal reimbursement (up to $40)");
    expect(JSON.stringify(d)).not.toContain("65");
    expect(d.label).toMatch(/not earnings/);
  });
  it("labels reimbursement-only, commission and non-cash without amounts", () => {
    expect(
      formatCompensation({ type: "reimbursement_only", item: "Purchase", maxReimbursement: 8 }),
    ).toMatchObject({ primary: "Purchase reimbursed", isAmount: false });
    expect(formatCompensation({ type: "commission", recurring: false }).primary).toBe(
      "Earn commissions",
    );
    expect(formatCompensation({ type: "commission", recurring: true }).label).toMatch(
      /not guaranteed/,
    );
    expect(formatCompensation({ type: "hybrid" }).primary).toBe("Base pay + commission");
    expect(formatCompensation({ type: "hybrid", baseAmount: 100, currency: "USD" }).secondary).toBe(
      "+ commission",
    );
    expect(formatCompensation({ type: "non_cash", label: "Gift card rewards" }).primary).toBe(
      "Gift card rewards",
    );
    expect(formatCompensation({ type: "variable" }).primary).toBe("Pay varies");
    expect(formatCompensation({ type: "unknown" }).primary).toBe(
      "Check provider for current rates",
    );
  });
  it("only sorts on verified cash amounts", () => {
    expect(sortableAmount({ type: "range", min: 50, max: 150, currency: "USD" })).toBe(150);
    expect(
      sortableAmount({ type: "reimbursement_only", item: "Meal", maxReimbursement: 40 }),
    ).toBeUndefined();
    expect(sortableAmount({ type: "commission", recurring: true })).toBeUndefined();
  });

  it("never shows non-cash rewards as cash and never sorts them", () => {
    const nonCash = [
      { type: "gift_card", amount: 10, currency: "USD" },
      { type: "free_product" },
      { type: "competition_prize" },
      { type: "licensing_royalties" },
      { type: "non_cash", label: "Points" },
    ] as const;
    for (const c of nonCash) {
      const d = formatCompensation(c);
      expect(d.isAmount).toBe(false);
      expect(sortableAmount(c)).toBeUndefined();
    }
    expect(formatCompensation({ type: "gift_card", amount: 10, currency: "USD" }).primary).toBe(
      "$10 USD gift card",
    );
    expect(formatCompensation({ type: "free_product" }).label).toMatch(/not cash/i);
  });
  it("shows the commission basis and the unit an amount applies to", () => {
    expect(
      formatCompensation({ type: "commission", recurring: false, basis: "percent" }).secondary,
    ).toBe("Percentage-based · performance-based");
    // Audio-hour pay is labelled as such, never as an hourly wage.
    const audio = formatCompensation({
      type: "fixed",
      amount: 30,
      currency: "USD",
      per: "audio hour",
    });
    expect(audio.unit).toBe("USD / audio hour");
    expect(audio.label).toBe("$30 USD per audio hour");
  });
});
