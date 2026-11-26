/**
 * Email (My Daily 8, alerts) — subscribers, consent, sends, events, suppressions, settings.
 * RLS/grants/functions in drizzle/0007_email_rls.sql. Promotional email is opt-in only and
 * never tied to account creation.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { opportunities } from "./app";
import { user } from "./auth";

export const subscriberStatus = pgEnum("subscriber_status", [
  "pending",
  "active",
  "unsubscribed",
  "bounced",
  "complained",
]);
/** website_only = keep preferences, send nothing. */
export const emailFrequency = pgEnum("email_frequency", [
  "daily",
  "weekly",
  "alerts",
  "website_only",
]);
export const workMode = pgEnum("work_mode", ["any", "remote", "local"]);

export const emailSubscribers = pgTable(
  "email_subscribers",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(),
    /** Set when the subscription belongs to a signed-in account (verified address). */
    userId: text().references(() => user.id, { onDelete: "set null" }),
    status: subscriberStatus().notNull().default("pending"),
    frequency: emailFrequency().notNull().default("daily"),
    // Preferences (rules-based personalisation)
    country: text(),
    region: text(),
    city: text(),
    categories: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** /earn subsection slugs, e.g. capture-earn. */
    creativeInterests: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    workMode: workMode().notNull().default("any"),
    beginnerOnly: boolean().notNull().default(false),
    /** Equipment the subscriber has: smartphone, computer, camera. Empty = not stated. */
    equipment: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    compensationTypes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    searchQuery: text(),
    timeZone: text().notNull().default("America/Vancouver"),
    sendHour: integer().notNull().default(8),
    // Consent record (CASL / CAN-SPAM)
    consentText: text().notNull(),
    consentVersion: text().notNull(),
    consentSource: text().notNull(),
    consentedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    confirmToken: uuid().defaultRandom(),
    confirmedAt: timestamp({ withTimezone: true }),
    /** Secret for preferences and unsubscribe links. */
    token: uuid().notNull().defaultRandom().unique(),
    unsubscribedAt: timestamp({ withTimezone: true }),
    lastSentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("email_subscribers_email_len", sql`char_length(${t.email}) <= 254`),
    check("email_subscribers_send_hour", sql`${t.sendHour} between 0 and 23`),
    check("email_subscribers_country", sql`${t.country} is null or ${t.country} in ('CA','US')`),
    index("email_subscribers_status_idx").on(t.status, t.frequency),
  ],
);

export const emailSendStatus = pgEnum("email_send_status", [
  "queued",
  "sent",
  "failed",
  "skipped",
  "dry_run",
]);

/** One row per intended email. send_key makes scheduled sends idempotent. */
export const emailSends = pgTable(
  "email_sends",
  {
    id: uuid().primaryKey().defaultRandom(),
    subscriberId: uuid().references(() => emailSubscribers.id, { onDelete: "set null" }),
    email: text().notNull(),
    /** daily8 | weekly8 | alert | confirm | test | … */
    campaign: text().notNull(),
    sendKey: text().notNull().unique(),
    status: emailSendStatus().notNull().default("queued"),
    subject: text(),
    /** Opportunity ids included (for click validation and repetition control). */
    items: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    resendId: text(),
    error: text(),
    attempts: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("email_sends_created_idx").on(t.createdAt),
    index("email_sends_subscriber_idx").on(t.subscriberId, t.createdAt),
    index("email_sends_resend_idx").on(t.resendId),
  ],
);

/** Delivery webhooks (Resend) and our own click redirects. */
export const emailEvents = pgTable(
  "email_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    /** Webhook message id (svix-id) for idempotency; null for internal events. */
    externalId: text().unique(),
    type: text().notNull(),
    sendId: uuid().references(() => emailSends.id, { onDelete: "set null" }),
    resendId: text(),
    email: text(),
    opportunityId: uuid().references(() => opportunities.id, { onDelete: "set null" }),
    payload: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_events_type_time_idx").on(t.type, t.createdAt)],
);

/** Addresses we must never email (hard bounces, complaints, manual). */
export const emailSuppressions = pgTable("email_suppressions", {
  email: text().primaryKey(),
  reason: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Singleton (id = 1) admin-controlled sending settings. Paused by default. */
export const emailSettings = pgTable(
  "email_settings",
  {
    id: integer().primaryKey().default(1),
    sendingPaused: boolean().notNull().default(true),
    dailyLimit: integer().notNull().default(90),
    monthlyLimit: integer().notNull().default(2900),
    /** Max emails per cron run (batching). */
    batchSize: integer().notNull().default(50),
    campaigns: jsonb()
      .$type<Record<string, boolean>>()
      .notNull()
      .default(sql`'{"daily8": true, "weekly8": true, "alerts": false, "confirm": true}'::jsonb`),
    /** Founder-entered from the Resend dashboard (not verified by code). */
    planName: text().notNull().default("Free (verify in Resend)"),
    planMonthlyQuota: integer().notNull().default(3000),
    planMonthlyCostUsd: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
    /** Warn in the dashboard above this share of the monthly limit. */
    alertThresholdPct: integer().notNull().default(80),
    /** Sender identification required in every promotional email (CAN-SPAM/CASL). */
    senderName: text().notNull().default("8Tasks.com"),
    postalAddress: text(),
    replyTo: text(),
    weeklyDay: integer().notNull().default(1),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("email_settings_singleton", sql`${t.id} = 1`),
    check("email_settings_weekday", sql`${t.weeklyDay} between 0 and 6`),
    check(
      "email_settings_limits",
      sql`${t.dailyLimit} >= 0 and ${t.monthlyLimit} >= 0 and ${t.batchSize} between 1 and 500`,
    ),
  ],
);
