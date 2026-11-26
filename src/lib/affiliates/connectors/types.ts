/** Scheduled-sync connector contract (spec §3). */
export type SyncResult =
  | { status: "ok"; rowsUpserted: number; message?: string }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };

export interface EarningsConnector {
  id: "impact" | "awin" | "cj" | "flexoffers" | "daisycon";
  /** Env var names this connector needs (values are never logged). */
  requiredEnv: string[];
  /** Official max window per request, in days. */
  maxWindowDays: number;
  syncTransactions(from: Date, to: Date): Promise<SyncResult>;
  syncPayouts?(from: Date, to: Date): Promise<SyncResult>;
  syncClicks?(from: Date, to: Date): Promise<SyncResult>;
}

export function missingEnv(
  names: string[],
  env: Record<string, string | undefined> = process.env,
): string[] {
  return names.filter((n) => !env[n]);
}
