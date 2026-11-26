/**
 * Discovery configuration, admin-only provider facts and public intake tables
 * (master prompt 2026-11-25). RLS/grants live in drizzle/0005_discovery_rls.sql.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { categories, opportunities, providers, subcategories } from "./app";

// ---------------------------------------------------------------------------
// Admin-only provider commercial facts. Never readable by app_runtime.
// ---------------------------------------------------------------------------
export const commissionModel = pgEnum("commission_model", [
  "unknown",
  "contributor_recruitment",
  "business_client_referral",
  "product_sales",
  "personal_referral",
  "none",
]);
export const readinessLevel = pgEnum("readiness_level", ["A", "B", "C", "D", "E"]);

export const providerInternal = pgTable("provider_internal", {
  providerId: uuid()
    .primaryKey()
    .references(() => providers.id, { onDelete: "cascade" }),
  commissionModel: commissionModel().notNull().default("unknown"),
  commissionText: text(),
  commissionCurrency: text(),
  qualifyingAction: text(),
  trackingWindow: text(),
  recurringCommission: boolean(),
  sourceUrls: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  readinessLevel: readinessLevel(),
  /**
   * Level D providers may be listed for user value only when the founder sets this, with no
   * affiliate links and no commission claims (master prompt §6).
   */
  userValueListing: boolean().notNull().default(false),
  approvalStatus: text(),
  missionAlignment: text(),
  businessContact: text(),
  lastReviewedAt: date(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Discovery groups: pathways, category tabs and /earn subsections (admin-managed).
// ---------------------------------------------------------------------------
export const discoveryGroupKind = pgEnum("discovery_group_kind", [
  "pathway",
  "category_tab",
  "subsection",
]);

export const discoveryGroups = pgTable(
  "discovery_groups",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: discoveryGroupKind().notNull(),
    slug: text().notNull(),
    /** Category tabs belong to one category; pathways/subsections are cross-category. */
    categoryId: uuid().references(() => categories.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text(),
    /** lucide icon name (pathways/subsections). */
    icon: text(),
    accent: text(),
    /** Bullet list shown on the group's page. */
    includes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Listings in these subcategories (any category) belong to the group. */
    subcategorySlugs: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Whole categories that belong to the group. */
    categorySlugs: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("discovery_groups_kind_slug_key").on(t.kind, t.categoryId, t.slug).nullsNotDistinct(),
    check("discovery_groups_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "discovery_groups_tab_category",
      sql`(${t.kind} = 'category_tab') = (${t.categoryId} is not null)`,
    ),
  ],
);

/** Secondary categories/subcategories for one opportunity record (no duplicate rows). */
export const opportunityCategories = pgTable(
  "opportunity_categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    opportunityId: uuid()
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    subcategoryId: uuid().references(() => subcategories.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("opportunity_categories_key")
      .on(t.opportunityId, t.categoryId, t.subcategoryId)
      .nullsNotDistinct(),
    index("opportunity_categories_category_idx").on(t.categoryId),
  ],
);

/** Explicit membership of an opportunity in a discovery group (e.g. a subsection). */
export const opportunityGroups = pgTable(
  "opportunity_groups",
  {
    opportunityId: uuid()
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    groupId: uuid()
      .notNull()
      .references(() => discoveryGroups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.opportunityId, t.groupId] })],
);

// ---------------------------------------------------------------------------
// Public intake (insert-only for app_runtime; reviewed in /admin/inbox). Never auto-published.
// ---------------------------------------------------------------------------
export const intakeStatus = pgEnum("intake_status", ["new", "reviewed", "dismissed"]);
export const reportReason = pgEnum("report_reason", [
  "broken_link",
  "expired",
  "incorrect_pay",
  "incorrect_location",
  "registration_closed",
  "suspicious",
  "undisclosed_costs",
  "misleading",
  "other",
]);

export const listingReports = pgTable(
  "listing_reports",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    opportunityId: uuid().references(() => opportunities.id, { onDelete: "set null" }),
    providerId: uuid().references(() => providers.id, { onDelete: "set null" }),
    reason: reportReason().notNull(),
    details: text(),
    contactEmail: text(),
    status: intakeStatus().notNull().default("new"),
    adminNote: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("listing_reports_details_len", sql`char_length(coalesce(${t.details}, '')) <= 2000`),
    index("listing_reports_status_idx").on(t.status, t.createdAt),
  ],
);

export const providerSubmissions = pgTable(
  "provider_submissions",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    companyName: text().notNull(),
    websiteUrl: text().notNull(),
    contactName: text(),
    contactEmail: text().notNull(),
    categorySlug: text(),
    notes: text(),
    status: intakeStatus().notNull().default("new"),
    adminNote: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("provider_submissions_website_https", sql`${t.websiteUrl} ~ '^https?://'`),
    check("provider_submissions_notes_len", sql`char_length(coalesce(${t.notes}, '')) <= 2000`),
    index("provider_submissions_status_idx").on(t.status, t.createdAt),
  ],
);
