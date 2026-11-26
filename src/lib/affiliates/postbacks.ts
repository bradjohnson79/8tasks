import { STATUS_ALIASES } from "./entries";

/**
 * Inbound postback parsing (spec §4.1). Network token names marked "unverified" in
 * docs/AFFILIATE_INTEGRATIONS.md must be confirmed in-account before going live.
 * The callback URL Brad configures carries program= (and currency= where the network
 * doesn't send one), plus key= for authentication.
 */
export type PostbackNetwork = "maxbounty" | "flexoffers" | "impact" | "generic";
export const POSTBACK_NETWORKS: PostbackNetwork[] = [
  "maxbounty",
  "flexoffers",
  "impact",
  "generic",
];

export type ParsedPostback = {
  programId?: string;
  campaignId?: string;
  externalId?: string;
  clickId?: string;
  status: "pending" | "approved" | "paid" | "reversed";
  commission?: number;
  sale?: number;
  currency?: string;
  eventAt?: Date;
  raw: Record<string, string>;
};

const SECRET_KEYS = /^(key|secret|token|apikey|api_key|password|auth|signature)$/i;

export function scrub(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([k]) => !SECRET_KEYS.test(k))
      .map(([k, v]) => [k, v.slice(0, 500)]),
  );
}

const num = (v?: string) => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && Math.abs(n) < 1_000_000 ? n : undefined;
};
const date = (v?: string) => {
  if (!v) return undefined;
  const d = /^\d{9,10}$/.test(v) ? new Date(Number(v) * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const status = (v?: string) => (v ? STATUS_ALIASES[v.trim().toLowerCase()] : undefined);
const clean = (v?: string) => (v && /^[A-Za-z0-9._:-]{1,100}$/.test(v) ? v : undefined);

export function parsePostback(network: PostbackNetwork, p: Record<string, string>): ParsedPostback {
  const base = {
    programId: p.program,
    currency: p.currency?.toUpperCase(),
    raw: scrub(p),
  };
  switch (network) {
    case "maxbounty": {
      // Unverified tokens (#S2#, #RATE#, #CONVERSION_ID#): confirm in the approved dashboard.
      const clickId = clean(p.s2);
      const commission = num(p.rate);
      return {
        ...base,
        clickId,
        commission,
        externalId:
          clean(p.conversion_id) ?? (clickId ? `click:${clickId}:${commission ?? 0}` : undefined),
        status: status(p.status) ?? "pending",
        currency: base.currency ?? "USD", // MaxBounty pays in USD (official minimum USD 100)
      };
    }
    case "flexoffers": {
      // Macros: #fobs# #on# #sa# #ca# #clickid# #flx_salesid# #et#
      const clickId = clean(p.fobs) ?? clean(p.clickid);
      return {
        ...base,
        clickId,
        externalId: clean(p.flx_salesid) ?? clean(p.on),
        commission: num(p.ca),
        sale: num(p.sa),
        eventAt: date(p.et),
        status: status(p.status) ?? "pending",
      };
    }
    case "impact": {
      // Event Notifications: campaign_id, action_id, status, payout (GET or POST JSON).
      return {
        ...base,
        campaignId: clean(p.campaign_id),
        externalId: clean(p.action_id),
        clickId: clean(p.subid1 ?? p.sub_id1 ?? p.subId1),
        commission: num(p.payout),
        sale: num(p.amount),
        currency: base.currency ?? p.payout_currency?.toUpperCase(),
        eventAt: date(p.event_date),
        status: status(p.status) ?? "pending",
      };
    }
    default: {
      const clickId = clean(p.click_id) ?? clean(p.sub_id);
      const commission = num(p.commission ?? p.payout ?? p.amount);
      return {
        ...base,
        clickId,
        externalId:
          clean(p.external_id) ??
          clean(p.transaction_id) ??
          (clickId ? `click:${clickId}:${commission ?? 0}` : undefined),
        commission,
        sale: num(p.sale_amount ?? p.sale),
        eventAt: date(p.event_date),
        status: status(p.status) ?? "pending",
      };
    }
  }
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
