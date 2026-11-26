import "server-only";
import { serverEnv } from "@/lib/env";
import { resolveSiteUrls } from "@/lib/site-url";

/**
 * Email configuration. Secrets come only from server env vars (never NEXT_PUBLIC_*).
 * Real delivery needs RESEND_API_KEY. Automated sending additionally needs
 * EMAIL_SENDING_ENABLED=true AND the admin "pause" switch off AND a postal address.
 */
export function emailConfig() {
  const e = process.env;
  return {
    apiKey: e.RESEND_API_KEY || undefined,
    webhookSecret: e.RESEND_WEBHOOK_SECRET || undefined,
    /** Master switch for automated sends (Daily 8, alerts). Off unless exactly "true". */
    automatedEnabled: e.EMAIL_SENDING_ENABLED === "true",
    from: {
      daily8: e.EMAIL_FROM_DAILY8 || "8Tasks My Daily 8 <daily8@8tasks.com>",
      welcome: e.EMAIL_FROM_WELCOME || "8Tasks <welcome@8tasks.com>",
      accounts: e.EMAIL_FROM_ACCOUNTS || "8Tasks Accounts <accounts@8tasks.com>",
      partners: e.EMAIL_FROM_PARTNERS || "8Tasks Partners <partners@8tasks.com>",
      notifications: e.EMAIL_FROM_NOTIFICATIONS || "8Tasks <notifications@8tasks.com>",
    },
    replyTo: e.EMAIL_REPLY_TO || undefined,
  };
}

/** Public site origin for links in emails (https://8tasks.com in production). */
export function siteOrigin(): string {
  return resolveSiteUrls(serverEnv()).baseURL.replace(/\/$/, "");
}

export const CONSENT_VERSION = "2026-11-26.v1";
export const CONSENT_TEXT =
  "Yes, email me free 8Tasks opportunity emails (My Daily 8 and the alerts I choose). I can unsubscribe at any time.";
