/**
 * 8Tasks affiliate earnings feed (admin-only). See docs/AFFILIATE_INTEGRATIONS.md.
 * Two layers: affiliate_transactions (source of truth, upserted per external id) and
 * period rollups computed from it (src/lib/affiliates/rollup.ts). Never only summaries.
 * RLS: app_admin only; postbacks write through a SECURITY DEFINER function.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { providers } from "./app";

export const affiliateProgramStatus = pgEnum("affiliate_program_status", [
  "live",
  "pending_signup",
  "waiting_for_site",
  "paused",
  "not_in_scope",
]);

export const affiliateTxType = pgEnum("affiliate_tx_type", [
  "conversion",
  "adjustment",
  "payout",
  /** Period aggregate from a dashboard/manual entry (clicks + conversions + commission). */
  "summary",
]);

export const affiliateTxStatus = pgEnum("affiliate_tx_status", [
  "pending",
  "approved",
  "paid",
  "reversed",
]);

export const affiliateTxSource = pgEnum("affiliate_tx_source", [
  "impact_api",
  "awin_api",
  "cj_api",
  "flexoffers_api",
  "daisycon_api",
  "postback",
  "csv_import",
  "manual",
]);

export const AFFILIATE_NETWORKS = [
  "direct",
  "impact",
  "awin",
  "cj",
  "flexoffers",
  "daisycon",
  "maxbounty",
  "offerjuice",
  "undecided",
] as const;

/** Registry: one row per program 8Tasks promotes or is applying to (and one per network). */
export const affiliatePrograms = pgTable(
  "affiliate_programs",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    network: text().notNull(),
    networkCampaignId: text(),
    payoutMethod: text(),
    currencyDefault: text(),
    affiliateUrl: text(),
    dataMethod: text(),
    docsUrl: text(),
    status: affiliateProgramStatus().notNull().default("pending_signup"),
    /** Optional link to the public provider this program pays for. */
    providerId: uuid().references(() => providers.id, { onDelete: "set null" }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("affiliate_programs_id_format", sql`${t.id} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "affiliate_programs_network",
      sql`${t.network} in ('direct','impact','awin','cj','flexoffers','daisycon','maxbounty','offerjuice','undecided')`,
    ),
    check(
      "affiliate_programs_currency",
      sql`${t.currencyDefault} is null or ${t.currencyDefault} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "affiliate_programs_url_https",
      sql`${t.affiliateUrl} is null or ${t.affiliateUrl} ~ '^https://'`,
    ),
  ],
);

/** Source of truth: conversions, adjustments, payouts and period summaries. */
export const affiliateTransactions = pgTable(
  "affiliate_transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    programId: text()
      .notNull()
      .references(() => affiliatePrograms.id, { onDelete: "restrict" }),
    network: text().notNull(),
    externalId: text(),
    type: affiliateTxType().notNull(),
    status: affiliateTxStatus().notNull(),
    eventAt: timestamp({ withTimezone: true }).notNull(),
    postedAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    /** Only on aggregate (summary) rows; null = unknown, never 0 by default. */
    clicks: integer(),
    /** Only on summary rows: number of conversions the row represents. */
    conversions: integer(),
    saleAmount: numeric({ precision: 14, scale: 2 }),
    /** Signed; reversals/corrections negative or separate adjustment rows. */
    commissionAmount: numeric({ precision: 14, scale: 2 }).notNull().default("0"),
    currency: text().notNull(),
    subId: text(),
    clickId: text(),
    payoutMethod: text(),
    payoutExternalId: text(),
    raw: jsonb(),
    source: affiliateTxSource().notNull(),
    syncedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    note: text(),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("affiliate_tx_external_key")
      .on(t.programId, t.source, t.externalId)
      .where(sql`${t.externalId} is not null`),
    index("affiliate_tx_program_event_idx").on(t.programId, t.eventAt),
    index("affiliate_tx_click_idx").on(t.clickId),
    check("affiliate_tx_currency", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check(
      "affiliate_tx_counts",
      sql`coalesce(${t.clicks}, 0) >= 0 and coalesce(${t.conversions}, 0) >= 0`,
    ),
  ],
);

/** One row per connector/postback/import run, for "last synced" and failures. */
export const affiliateSyncRuns = pgTable(
  "affiliate_sync_runs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    source: text().notNull(),
    /** ok | error | not_configured */
    status: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    rowsUpserted: integer().notNull().default(0),
    message: text(),
  },
  (t) => [index("affiliate_sync_runs_source_idx").on(t.source, t.startedAt)],
);
