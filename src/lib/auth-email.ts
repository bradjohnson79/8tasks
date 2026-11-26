import "server-only";
import { emailConfig, siteOrigin } from "./email/config";
import { deliver } from "./email/deliver";
import { magicLinkEmail } from "./email/templates/catalog";

/** Endpoints allowed to create a session for an admin (password + TOTP flow only). */
export const ADMIN_SESSION_PATHS = [
  "/sign-in/email",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/enable",
];

/**
 * Sign-in links are account emails (not promotional): sent whenever RESEND_API_KEY is set.
 * Without a key (local dev), the link is logged on the server — never in production.
 */
export async function sendMagicLinkEmail(email: string, url: string) {
  const cfg = emailConfig();
  if (!cfg.apiKey) {
    if (process.env.VERCEL_ENV === "production") throw new Error("Email sign-in is not configured");
    console.info(`[dev] magic link for ${email.replace(/(.).+@/, "$1***@")}: ${url}`);
    return;
  }
  const built = magicLinkEmail({
    url,
    footer: { kind: "transactional", senderName: "8Tasks.com", siteUrl: siteOrigin() },
  });
  const res = await deliver(
    { from: cfg.from.accounts, to: email, subject: built.subject, react: built.react },
    true,
  );
  if (res.mode === "failed") throw new Error("Could not send the sign-in email");
}
