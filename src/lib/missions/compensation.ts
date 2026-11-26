import type { Compensation, Currency } from "./types";

export type CompensationDisplay = {
  /** Main text, e.g. "$25" or "Pay varies". */
  primary: string;
  /** Unit shown smaller after the amount, e.g. "USD", "/hour". */
  unit?: string;
  /** Second line, e.g. "+ meal reimbursement (up to $40)". */
  secondary?: string;
  /** True when primary is a verified cash amount (rendered large, emerald, tabular). */
  isAmount: boolean;
  /** Full sentence for screen readers. */
  label: string;
};

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/**
 * Turns verified compensation terms into display text (design update §9–10).
 * Reimbursement is never added to cash pay: "$25 + meal reimbursement", not "$65".
 */
export function formatCompensation(c: Compensation): CompensationDisplay {
  switch (c.type) {
    case "fixed":
      return {
        primary: money(c.amount),
        unit: c.per ? `${c.currency} / ${c.per}` : c.currency,
        isAmount: true,
        label: `${money(c.amount)} ${c.currency}${c.per ? ` per ${c.per}` : ""}`,
      };
    case "range":
      return {
        primary: `${money(c.min)}–${money(c.max)}`,
        unit: c.per ? `${c.currency} / ${c.per}` : c.currency,
        isAmount: true,
        label: `${money(c.min)} to ${money(c.max)} ${c.currency}${c.per ? ` per ${c.per}` : ""}`,
      };
    case "hourly":
      return {
        primary: money(c.amount),
        unit: "/hour",
        isAmount: true,
        label: `${money(c.amount)} ${c.currency} per hour`,
      };
    case "payment_plus_reimbursement": {
      const cap = c.maxReimbursement ? ` (up to ${money(c.maxReimbursement)})` : "";
      return {
        primary: money(c.amount),
        unit: c.currency,
        secondary: `+ ${c.item.toLowerCase()} reimbursement${cap}`,
        isAmount: true,
        label: `${money(c.amount)} ${c.currency} cash payment, plus ${c.item.toLowerCase()} reimbursement${cap}. Reimbursement is not earnings.`,
      };
    }
    case "reimbursement_only": {
      const cap = c.maxReimbursement ? `Up to ${money(c.maxReimbursement)}` : undefined;
      return {
        primary: `${c.item} reimbursed`,
        secondary: cap,
        isAmount: false,
        label: `${c.item} reimbursed${cap ? `, ${cap.toLowerCase()}` : ""}. No cash payment.`,
      };
    }
    case "commission": {
      const basis =
        c.basis === "percent"
          ? "Percentage-based"
          : c.basis === "flat"
            ? "Flat per referral"
            : null;
      const secondary = basis ? `${basis} · performance-based` : "Performance-based";
      return c.recurring
        ? {
            primary: "Recurring commissions",
            secondary,
            isAmount: false,
            label: `Recurring commissions available. ${basis ? `${basis}. ` : ""}Performance-based, not guaranteed.`,
          }
        : {
            primary: "Earn commissions",
            secondary,
            isAmount: false,
            label: `Earn commissions. ${basis ? `${basis}. ` : ""}Performance-based, not guaranteed.`,
          };
    }
    case "hybrid":
      return c.baseAmount
        ? {
            primary: money(c.baseAmount),
            unit: c.currency,
            secondary: "+ commission",
            isAmount: true,
            label: `${money(c.baseAmount)} ${c.currency ?? ""} base payment plus commission`,
          }
        : {
            primary: "Base pay + commission",
            isAmount: false,
            label: "Base payment plus commission",
          };
    case "non_cash":
      return {
        primary: c.label,
        secondary: "Not cash",
        isAmount: false,
        label: `${c.label}. Not cash.`,
      };
    // Non-cash rewards: neutral styling, never an emerald cash amount.
    case "gift_card": {
      const value = c.amount !== undefined ? `${money(c.amount)} ${c.currency ?? ""}`.trim() : null;
      return {
        primary: value ? `${value} gift card` : "Gift card rewards",
        secondary: "Not cash",
        isAmount: false,
        label: `${value ? `${value} gift card` : "Gift card rewards"}. Not cash.`,
      };
    }
    case "free_product":
      return {
        primary: c.label ?? "Free product",
        secondary: "Not cash",
        isAmount: false,
        label: `${c.label ?? "Free product"}. A product, not cash payment.`,
      };
    case "competition_prize":
      return {
        primary: c.label ?? "Prize competition",
        secondary: "Not guaranteed",
        isAmount: false,
        label: `${c.label ?? "Prize competition"}. Prizes are not guaranteed and are not wages.`,
      };
    case "licensing_royalties":
      return {
        primary: "Licensing royalties",
        secondary: "Varies per licence",
        isAmount: false,
        label: "Royalties per licence. Amounts vary and are not guaranteed.",
      };
    case "variable":
      return {
        primary: "Pay varies",
        secondary: "Per assignment",
        isAmount: false,
        label: "Pay varies by assignment",
      };
    case "unknown":
      return {
        primary: "Check provider for current rates",
        isAmount: false,
        label: "Compensation not listed. Check the provider for current rates.",
      };
  }
}

/** Largest verified cash figure, used only for "Highest paying" sorting. Undefined = no amount. */
export function sortableAmount(c: Compensation): number | undefined {
  switch (c.type) {
    case "fixed":
    case "payment_plus_reimbursement":
      return c.amount;
    case "range":
      return c.max;
    case "hourly":
      return c.amount;
    case "hybrid":
      return c.baseAmount;
    default:
      return undefined;
  }
}

export const CURRENCIES: Currency[] = ["USD", "CAD"];
