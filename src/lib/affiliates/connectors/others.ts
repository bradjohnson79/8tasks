import { missingEnv, type EarningsConnector, type SyncResult } from "./types";

/**
 * Placeholders for networks whose accounts don't exist yet (spec §9 "Later").
 * Each reports its credential state only. Implement from official docs when the
 * account is approved: Awin (transactions ≤ 31 days, 20 calls/min), FlexOffers
 * (/allsales per status, /payments/*), CJ (publisherCommissions GraphQL ≤ 31 days),
 * Daisycon (OAuth 2.1 + PKCE, 50 req/min/IP).
 */
function placeholder(
  id: EarningsConnector["id"],
  requiredEnv: string[],
  maxWindowDays: number,
): EarningsConnector {
  return {
    id,
    requiredEnv,
    maxWindowDays,
    async syncTransactions(): Promise<SyncResult> {
      const missing = missingEnv(requiredEnv);
      return {
        status: "not_configured",
        message: missing.length
          ? `Credentials not configured (${missing.join(", ")})`
          : "Credentials present; connector not implemented until the account is live.",
      };
    },
  };
}

export const awinConnector = placeholder("awin", ["AWIN_API_TOKEN", "AWIN_PUBLISHER_ID"], 31);
export const flexoffersConnector = placeholder("flexoffers", ["FLEXOFFERS_API_KEY"], 31);
export const cjConnector = placeholder("cj", ["CJ_API_TOKEN", "CJ_PUBLISHER_ID"], 31);
export const daisyconConnector = placeholder(
  "daisycon",
  ["DAISYCON_CLIENT_ID", "DAISYCON_CLIENT_SECRET"],
  31,
);
