"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSends, emailSettings, emailSubscribers, emailSuppressions } from "@/db/schema";
import { audit, requireAdmin } from "@/lib/admin";
import { emailConfig, siteOrigin } from "@/lib/email/config";
import { buildDaily8 } from "@/lib/email/daily8-build";
import { deliver } from "@/lib/email/deliver";
import { runScheduledEmails } from "@/lib/email/runner";
import { confirmSubscriptionEmail, welcomeEmail } from "@/lib/email/templates/catalog";
import { loadOpportunities } from "@/lib/missions/source";
import { firstError, formToObject } from "@/lib/validation/admin";

/** Admin-only email controls. Every action: requireAdmin() (role + MFA) and an audit entry. */
type State = { error: string } | undefined;
function back(msg: string): never {
  redirect(`/admin/email?saved=${encodeURIComponent(msg)}`);
}

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const settingsSchema = z.object({
  sendingPaused: z.boolean(),
  dailyLimit: int(0, 100_000),
  monthlyLimit: int(0, 3_000_000),
  batchSize: int(1, 500),
  weeklyDay: int(0, 6),
  planName: z.string().trim().min(1).max(80),
  planMonthlyQuota: int(0, 10_000_000),
  planMonthlyCostUsd: z.coerce
    .number()
    .min(0)
    .max(100_000)
    .transform((n) => n.toFixed(2)),
  alertThresholdPct: int(1, 100),
  senderName: z.string().trim().min(2).max(80),
  postalAddress: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
  replyTo: z.union([z.literal(""), z.string().trim().email()]).transform((v) => v || null),
  campaign_daily8: z.boolean(),
  campaign_weekly8: z.boolean(),
  campaign_alerts: z.boolean(),
  campaign_confirm: z.boolean(),
});

export async function saveEmailSettings(form: FormData): Promise<State> {
  const { session, db } = await requireAdmin();
  const parsed = settingsSchema.safeParse(
    formToObject(form, {
      booleans: [
        "sendingPaused",
        "campaign_daily8",
        "campaign_weekly8",
        "campaign_alerts",
        "campaign_confirm",
      ],
    }),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { campaign_daily8, campaign_weekly8, campaign_alerts, campaign_confirm, ...rest } =
    parsed.data;
  if (!rest.sendingPaused && !rest.postalAddress)
    return {
      error: "Add the sender postal address before un-pausing (required in promotional email).",
    };
  const values = {
    ...rest,
    campaigns: {
      daily8: campaign_daily8,
      weekly8: campaign_weekly8,
      alerts: campaign_alerts,
      confirm: campaign_confirm,
    },
  };
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(emailSettings).where(eq(emailSettings.id, 1));
    await tx.update(emailSettings).set(values).where(eq(emailSettings.id, 1));
    await audit(tx, session.user.id, "email.settings", "email_settings", "1", before, values);
  });
  back("Email settings saved.");
}

const testSchema = z.object({
  to: z.string().trim().toLowerCase().email(),
  template: z.enum(["daily8", "confirm", "welcome"]),
});

/** Sends one test email (real only if RESEND_API_KEY is set; otherwise a rendered dry run). */
export async function sendTestEmail(form: FormData): Promise<State> {
  const { session, db } = await requireAdmin();
  const parsed = testSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { to, template } = parsed.data;
  const [settings] = await db.select().from(emailSettings).where(eq(emailSettings.id, 1));
  const cfg = emailConfig();
  const sendId = randomUUID();
  const footer = {
    kind: "transactional" as const,
    senderName: settings.senderName,
    postalAddress: settings.postalAddress,
    siteUrl: siteOrigin(),
  };
  let msg: { subject: string; react: React.ReactElement; from: string; items: string[] };
  if (template === "daily8") {
    const built = await buildDaily8({
      variant: "daily",
      prefs: {
        categories: [],
        creativeInterests: [],
        workMode: "any",
        beginnerOnly: false,
        equipment: [],
        compensationTypes: [],
      },
      candidates: (await loadOpportunities()).filter((o) => !o.isDemo),
      recentlySent: [],
      lastSent: [],
      sendId,
      settings,
    });
    if (!built.send)
      return {
        error:
          "No eligible listings for a Daily 8 yet (needs published, non-demo listings whose provider allows email traffic).",
      };
    msg = {
      subject: `[TEST] ${built.subject}`,
      react: built.react,
      from: built.from,
      items: built.itemIds,
    };
  } else if (template === "confirm") {
    const b = confirmSubscriptionEmail({
      confirmUrl: `${siteOrigin()}/email/confirm?token=test`,
      footer,
    });
    msg = { subject: `[TEST] ${b.subject}`, react: b.react, from: cfg.from.welcome, items: [] };
  } else {
    const b = welcomeEmail({ discoverUrl: `${siteOrigin()}/missions`, footer });
    msg = { subject: `[TEST] ${b.subject}`, react: b.react, from: cfg.from.welcome, items: [] };
  }
  const res = await deliver(
    { to, from: msg.from, subject: msg.subject, react: msg.react, replyTo: settings.replyTo },
    !!cfg.apiKey,
  );
  await db.insert(emailSends).values({
    id: sendId,
    email: to,
    campaign: `test:${template}`,
    sendKey: `test:${sendId}`,
    status: res.mode === "sent" ? "sent" : res.mode === "dry_run" ? "dry_run" : "failed",
    subject: msg.subject,
    items: msg.items,
    resendId: res.mode === "sent" ? res.id : null,
    error: res.mode === "failed" ? res.error : null,
    attempts: 1,
    sentAt: res.mode === "failed" ? null : new Date(),
  });
  await audit(db, session.user.id, "email.test_send", "email_send", sendId, null, {
    to,
    template,
    mode: res.mode,
  });
  if (res.mode === "failed") return { error: `Send failed: ${res.error}` };
  back(
    res.mode === "sent"
      ? `Test email sent to ${to}.`
      : "No RESEND_API_KEY on this server: rendered only (dry run).",
  );
}

/** Runs the scheduler once now (same rules as the hourly job: pause, limits, idempotency). */
export async function runEmailNow(): Promise<State> {
  const { session, db } = await requireAdmin();
  const summary = await runScheduledEmails();
  await audit(db, session.user.id, "email.run_now", "email_settings", "1", null, summary);
  back(
    summary.status === "paused"
      ? "Sending is paused: nothing ran."
      : `Run complete (${summary.live ? "live" : "dry run"}): ${summary.sent} sent, ${summary.dryRun} dry run, ${summary.skipped} skipped (nothing to send), ${summary.failed} failed${summary.limitReached ? ", limit reached" : ""}.`,
  );
}

export async function adminUnsubscribe(id: string): Promise<State> {
  const { session, db } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Invalid id" };
  await db.transaction(async (tx) => {
    await tx
      .update(emailSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date() })
      .where(eq(emailSubscribers.id, id));
    await audit(tx, session.user.id, "email.admin_unsubscribe", "email_subscriber", id, null, null);
  });
  back("Unsubscribed.");
}

export async function removeSuppression(email: string): Promise<State> {
  const { session, db } = await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.delete(emailSuppressions).where(eq(emailSuppressions.email, email));
    await audit(tx, session.user.id, "email.unsuppress", "email_suppression", email, null, null);
  });
  back(
    "Removed from suppression list. The person must sign up and confirm again to receive email.",
  );
}
