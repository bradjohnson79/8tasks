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
        unit: c.currency,
        isAmount: true,
        label: `${money(c.amount)} ${c.currency}`,
      };
    case "range":
      return {
        primary: `${money(c.min)}–${money(c.max)}`,
        unit: c.currency,
        isAmount: true,
        label: `${money(c.min)} to ${money(c.max)} ${c.currency}`,
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
    case "commission":
      return c.recurring
        ? {
            primary: "Recurring commissions",
            secondary: "Performance-based",
            isAmount: false,
            label: "Recurring commissions available. Performance-based, not guaranteed.",
          }
        : {
            primary: "Earn commissions",
            secondary: "Performance-based",
            isAmount: false,
            label: "Earn commissions. Performance-based, not guaranteed.",
          };
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
      return { primary: c.label, isAmount: false, label: c.label };
    case "variable":
      return {
        primary: "Pay varies",
        secondary: "Per assignment",
        isAmount: false,
        label: "Pay varies by assignment",
      };
    case "unknown":
      return {
        primary: "See provider details",
        isAmount: false,
        label: "See provider for payment details",
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
