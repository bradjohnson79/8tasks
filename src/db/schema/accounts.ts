/**
 * Optional free user accounts (accounts addendum). Personal data only; no payment data.
 * Every table is owned by one user and protected by RLS on app.user_id (0011_accounts_rls.sql).
 * Admins have no access to personal tracking tables.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { opportunities } from "./app";
import { workMode } from "./email";

export const experienceLevel = pgEnum("experience_level", ["new", "some", "experienced"]);

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: text()
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text(),
    country: text(),
    region: text(),
    city: text(),
    categories: text().array().notNull().default(sql`'{}'::text[]`),
    creativeInterests: text().array().notNull().default(sql`'{}'::text[]`),
    workMode: workMode().notNull().default("any"),
    beginnerOnly: boolean().notNull().default(false),
    experienceLevel: experienceLevel(),
    equipment: text().array().notNull().default(sql`'{}'::text[]`),
    compensationTypes: text().array().notNull().default(sql`'{}'::text[]`),
    timeZone: text().notNull().default("America/Vancouver"),
    onboardedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("user_profiles_country", sql`${t.country} is null or ${t.country} in ('CA','US')`),
  ],
);

export const userSavedItems = pgTable(
  "user_saved_items",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Opportunity id (uuid) or demo id; kept as text so device saves merge without lookups. */
    itemId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    check("user_saved_items_id", sql`char_length(${t.itemId}) <= 80`),
  ],
);

export const userSavedSearches = pgTable(
  "user_saved_searches",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    q: text(),
    filters: text().array().notNull().default(sql`'{}'::text[]`),
    path: text(),
    label: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_saved_searches_user_idx").on(t.userId)],
);

/** Personal "My Missions" tracker. 8Tasks never verifies third-party work. */
export const missionStatus = pgEnum("mission_status", [
  "interested",
  "applied",
  "in_progress",
  "completed",
  "not_pursuing",
]);

export const userMissions = pgTable(
  "user_missions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    opportunityId: uuid().references(() => opportunities.id, { onDelete: "set null" }),
    providerName: text().notNull(),
    title: text().notNull(),
    status: missionStatus().notNull().default("interested"),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_missions_user_idx").on(t.userId),
    check("user_missions_len", sql`char_length(${t.title}) <= 160 and char_length(coalesce(${t.notes}, '')) <= 2000`),
  ],
);

/** Personal, self-reported earnings log. Not a wallet; 8Tasks holds no money. */
export const earningStatus = pgEnum("earning_status", ["expected", "received"]);

export const userEarnings = pgTable(
  "user_earnings",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerName: text().notNull(),
    activity: text(),
    earnedOn: date().notNull(),
    amountCents: integer().notNull().default(0),
    expensesCents: integer().notNull().default(0),
    reimbursementCents: integer().notNull().default(0),
    currency: text().notNull().default("USD"),
    status: earningStatus().notNull().default("expected"),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_earnings_user_idx").on(t.userId, t.earnedOn),
    check("user_earnings_currency", sql`${t.currency} in ('USD','CAD')`),
    check(
      "user_earnings_amounts",
      sql`${t.amountCents} between 0 and 100000000 and ${t.expensesCents} between 0 and 100000000 and ${t.reimbursementCents} between 0 and 100000000`,
    ),
  ],
);
