/**
 * Core 8Tasks schema. See docs/DATABASE.md for the full description and RLS model.
 * RLS policies, grants and triggers live in the hand-written migration
 * drizzle/0001_rls_and_guards.sql (drizzle-kit does not generate them).
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Per-provider affiliate facts default to "unknown" (CLAUDE.md rule 6). */
export const capability = pgEnum("capability", ["unknown", "yes", "no"]);
export const publishStatus = pgEnum("publish_status", ["draft", "published", "archived"]);
/** Where an opportunity's details come from. Individual missions need authorized data. */
export const opportunityDataSource = pgEnum("opportunity_data_source", [
  "provider_level",
  "authorized_feed",
  "authorized_manual",
]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

const slug = () => text().notNull();
const slugCheck = (name: string, col: unknown) =>
  check(name, sql`${col} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`);

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: slug().unique(),
    name: text().notNull(),
    description: text(),
    /** lucide-react icon name, e.g. "clipboard-list". */
    icon: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [slugCheck("categories_slug_format", t.slug)],
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: slug(),
    name: text().notNull(),
    description: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subcategories_category_slug_key").on(t.categoryId, t.slug),
    slugCheck("subcategories_slug_format", t.slug),
  ],
);

export const providers = pgTable(
  "providers",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: slug().unique(),
    name: text().notNull(),
    /** Provider's public homepage (not an affiliate link). */
    websiteUrl: text(),
    summary: text(),
    description: text(),
    logoUrl: text(),
    /** ISO 3166-1 alpha-2 codes where the provider accepts members, e.g. {US,CA}. Empty = unknown. */
    countries: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: publishStatus().notNull().default("draft"),
    // Affiliate program facts (rule 6): never assumed.
    affiliateNetwork: text(),
    supportsSubIds: capability().notNull().default("unknown"),
    supportsPostbacks: capability().notNull().default("unknown"),
    providesFeed: capability().notNull().default("unknown"),
    allowsRevenueShare: capability().notNull().default("unknown"),
    /** Admin-only notes. Never selected by public queries. */
    adminNotes: text(),
    isDemo: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    slugCheck("providers_slug_format", t.slug),
    check("providers_website_https", sql`${t.websiteUrl} is null or ${t.websiteUrl} ~ '^https://'`),
    check("providers_logo_https", sql`${t.logoUrl} is null or ${t.logoUrl} ~ '^https://'`),
  ],
);

/**
 * Admin-managed tracking URLs. The only redirect targets /go/[id] may use (rule 2).
 * Not readable by the public role; resolved via the resolve_outbound_link() function.
 */
export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid().primaryKey().defaultRandom(),
    providerId: uuid()
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    label: text().notNull(),
    destinationUrl: text().notNull(),
    /**
     * Documented network SubID parameter to append our click id to (e.g. subId1 for Impact,
     * clickRef for Awin, fobs for FlexOffers, s2 for MaxBounty). Null = never append
     * (direct programs such as Dreamstime/JoinBrands keep their exact link). Rule 6.
     */
    subidParam: text(),
    isActive: boolean().notNull().default(true),
    adminNotes: text(),
    isDemo: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("affiliate_links_provider_idx").on(t.providerId),
    check("affiliate_links_destination_https", sql`${t.destinationUrl} ~ '^https://[^\\s]+$'`),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid().primaryKey().defaultRandom(),
    providerId: uuid()
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    subcategoryId: uuid().references(() => subcategories.id, {
      onDelete: "set null",
    }),
    affiliateLinkId: uuid().references(() => affiliateLinks.id, {
      onDelete: "set null",
    }),
    slug: slug(),
    title: text().notNull(),
    summary: text(),
    description: text(),
    countries: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    dataSource: opportunityDataSource().notNull().default("provider_level"),
    status: publishStatus().notNull().default("draft"),
    /** Paid placement. Must be labelled "Sponsored" in the UI (rule 8). */
    isSponsored: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    isDemo: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("opportunities_provider_slug_key").on(t.providerId, t.slug),
    index("opportunities_category_idx").on(t.categoryId),
    slugCheck("opportunities_slug_format", t.slug),
  ],
);

/**
 * Outbound click log. Written only by resolve_outbound_link(). No raw IPs are stored.
 */
export const outboundClicks = pgTable(
  "outbound_clicks",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    /** Opaque click id passed to networks as SubID (no PII). */
    clickId: uuid().notNull().defaultRandom().unique(),
    affiliateLinkId: uuid()
      .notNull()
      .references(() => affiliateLinks.id, { onDelete: "restrict" }),
    providerId: uuid()
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    opportunityId: uuid().references(() => opportunities.id, {
      onDelete: "set null",
    }),
    clickedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Internal page path the click came from, e.g. "/providers/foo". */
    sourcePath: text(),
    /** ISO country from the hosting edge (e.g. x-vercel-ip-country), if available. */
    country: text(),
    deviceType: text(),
    isBot: boolean().notNull().default(false),
  },
  (t) => [
    index("outbound_clicks_link_time_idx").on(t.affiliateLinkId, t.clickedAt),
    index("outbound_clicks_time_idx").on(t.clickedAt),
  ],
);

/** Append-only record of admin changes. UPDATE/DELETE are blocked by trigger. */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorUserId: text().references(() => user.id, { onDelete: "set null" }),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    before: jsonb(),
    after: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_log_entity_idx").on(t.entityType, t.entityId)],
);
