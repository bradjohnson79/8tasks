import { chunkWindows } from "../period";
import { missingEnv, type EarningsConnector, type SyncResult } from "./types";

/**
 * Impact partner connector — SKELETON (spec §9 MVP). The 8Tasks Impact account is not live
 * yet (Group B), so this only reports "not configured" or "awaiting implementation".
 *
 * When the account is live, implement against the official Partner API only:
 *   GET https://api.impact.com/Mediapartners/{SID}/Actions?StartDate=&EndDate=&State=  (≤ 45-day window)
 *   GET https://api.impact.com/Mediapartners/{SID}/Invoices?StartDate=&EndDate=
 * Auth: HTTP Basic SID:token (read-only Partner token). Limits: Actions 500/h; honour
 * 429 Retry-After. Map State PENDING/APPROVED/REVERSED → pending/approved/reversed;
 * invoice line Status PAID / PaidDate → paid. Never call PUT /WithdrawalSettings.
 */
export const impactConnector: EarningsConnector = {
  id: "impact",
  requiredEnv: ["IMPACT_SID", "IMPACT_TOKEN"],
  maxWindowDays: 45,
  async syncTransactions(from: Date, to: Date): Promise<SyncResult> {
    const missing = missingEnv(this.requiredEnv);
    if (missing.length)
      return {
        status: "not_configured",
        message: `Credentials not configured (${missing.join(", ")})`,
      };
    const windows = chunkWindows(from, to, this.maxWindowDays);
    return {
      status: "not_configured",
      message: `Credentials present; Actions/Invoices sync not implemented until the Impact account is live (${windows.length} window(s) would be requested).`,
    };
  },
};
