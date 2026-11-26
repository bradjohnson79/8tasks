import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { adminDbUnsafe } from "@/db/client";
import { emailSends, emailSettings, emailSubscribers, emailSuppressions } from "@/db/schema";
import { loadOpportunities } from "@/lib/missions/source";
import { emailConfig } from "./config";
import { buildDaily8 } from "./daily8-build";
import { deliver } from "./deliver";

/** Local calendar facts for a time zone (falls back to Vancouver on a bad zone). */
export function localParts(now: Date, timeZone: string) {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  } catch {
    tz = "America/Vancouver";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday };
}

export async function getEmailSettings() {
  const db = adminDbUnsafe();
  const [s] = await db.select().from(emailSettings).where(eq(emailSettings.id, 1));
  return s;
}

/** Sends (or dry-runs) counted against the plan: real sends plus dry runs for previews. */
async function usage(db: ReturnType<typeof adminDbUnsafe>, now: Date) {
  const day = new Date(now.getTime() - 24 * 3600_000);
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [r] = await db
    .select({
      day: sql<number>`count(*) filter (where ${emailSends.sentAt} >= ${day.toISOString()})::int`,
      month: sql<number>`count(*) filter (where ${emailSends.sentAt} >= ${month.toISOString()})::int`,
    })
    .from(emailSends)
    .where(eq(emailSends.status, "sent"));
  return r;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 3;

export type RunSummary = {
  status: "paused" | "ok";
  live: boolean;
  considered: number;
  sent: number;
  dryRun: number;
  skipped: number;
  failed: number;
  limitReached: boolean;
};

/**
 * Hourly job: sends My Daily 8 / Weekly 8 to active subscribers whose local time has reached
 * their send hour. Idempotent (one row per subscriber+campaign+local date via send_key),
 * retries failures up to 3 times, respects pause, daily/monthly limits and batch size.
 */
export async function runScheduledEmails(now = new Date()): Promise<RunSummary> {
  const db = adminDbUnsafe();
  const settings = await getEmailSettings();
  const cfg = emailConfig();
  const out: RunSummary = {
    status: "ok",
    live: false,
    considered: 0,
    sent: 0,
    dryRun: 0,
    skipped: 0,
    failed: 0,
    limitReached: false,
  };
  if (!settings || settings.sendingPaused) return { ...out, status: "paused" };
  // Live only with the env master switch, an API key and sender identification.
  out.live = cfg.automatedEnabled && !!cfg.apiKey && !!settings.postalAddress;

  const used = await usage(db, now);
  let budget = Math.min(
    settings.batchSize,
    Math.max(0, settings.dailyLimit - used.day),
    Math.max(0, settings.monthlyLimit - used.month),
  );
  if (budget <= 0) return { ...out, limitReached: true };

  const campaigns = settings.campaigns ?? {};
  const freqs = (["daily", "weekly"] as const).filter(
    (f) => campaigns[f === "daily" ? "daily8" : "weekly8"],
  );
  if (!freqs.length) return out;

  const subs = await db
    .select()
    .from(emailSubscribers)
    .where(and(eq(emailSubscribers.status, "active"), inArray(emailSubscribers.frequency, freqs)));
  const suppressed = new Set(
    (await db.select({ email: emailSuppressions.email }).from(emailSuppressions)).map(
      (r) => r.email,
    ),
  );
  const candidates = (await loadOpportunities()).filter((o) => !o.isDemo);
  const since = new Date(now.getTime() - 7 * 86_400_000);

  for (const s of subs) {
    if (budget <= 0) {
      out.limitReached = true;
      break;
    }
    if (suppressed.has(s.email)) continue;
    const local = localParts(now, s.timeZone);
    if (local.hour < s.sendHour) continue;
    if (s.frequency === "weekly" && local.weekday !== settings.weeklyDay) continue;
    const campaign = s.frequency === "daily" ? "daily8" : "weekly8";
    const sendKey = `${campaign}:${s.id}:${local.date}`;
    out.considered++;

    const [existing] = await db.select().from(emailSends).where(eq(emailSends.sendKey, sendKey));
    if (existing && (existing.status !== "failed" || existing.attempts >= MAX_ATTEMPTS)) continue;

    const history = await db
      .select({ items: emailSends.items, createdAt: emailSends.createdAt })
      .from(emailSends)
      .where(
        and(
          eq(emailSends.subscriberId, s.id),
          inArray(emailSends.status, ["sent", "dry_run"]),
          gte(emailSends.createdAt, since),
        ),
      )
      .orderBy(sql`${emailSends.createdAt} desc`);

    const [row] = existing
      ? [existing]
      : await db
          .insert(emailSends)
          .values({ subscriberId: s.id, email: s.email, campaign, sendKey })
          .onConflictDoNothing({ target: emailSends.sendKey })
          .returning();
    if (!row) continue; // another run claimed it

    const built = await buildDaily8({
      variant: s.frequency === "daily" ? "daily" : "weekly",
      prefs: s,
      candidates,
      recentlySent: history.flatMap((h) => h.items),
      lastSent: history[0]?.items ?? [],
      sendId: row.id,
      token: s.token,
      settings,
      now,
    });
    if (!built.send) {
      // Nothing worth sending: record the skip (so we don't retry every hour), send nothing.
      await db
        .update(emailSends)
        .set({ status: "skipped", error: built.reason })
        .where(eq(emailSends.id, row.id));
      out.skipped++;
      continue;
    }
    const res = await deliver(
      {
        from: built.from,
        to: s.email,
        subject: built.subject,
        react: built.react,
        unsubscribeUrl: built.unsubscribeUrl,
        idempotencyKey: sendKey,
        replyTo: settings.replyTo,
        tags: [{ name: "campaign", value: campaign }],
      },
      out.live,
    );
    const status = res.mode === "sent" ? "sent" : res.mode === "dry_run" ? "dry_run" : "failed";
    await db
      .update(emailSends)
      .set({
        status,
        subject: built.subject,
        items: built.itemIds,
        resendId: res.mode === "sent" ? res.id : null,
        error: res.mode === "failed" ? res.error : null,
        attempts: row.attempts + 1,
        sentAt: status === "failed" ? null : now,
      })
      .where(eq(emailSends.id, row.id));
    if (status === "sent") {
      await db
        .update(emailSubscribers)
        .set({ lastSentAt: now })
        .where(eq(emailSubscribers.id, s.id));
      out.sent++;
      budget--;
      await sleep(600); // stay well under the API rate limit
    } else if (status === "dry_run") out.dryRun++;
    else out.failed++;
  }
  return out;
}
