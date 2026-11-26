CREATE TYPE "public"."commission_basis" AS ENUM('percent', 'flat');--> statement-breakpoint
CREATE TYPE "public"."compensation_type" AS ENUM('unknown', 'fixed', 'range', 'hourly', 'variable', 'reimbursement_only', 'payment_plus_reimbursement', 'commission', 'hybrid', 'non_cash', 'gift_card', 'free_product', 'competition_prize', 'licensing_royalties');--> statement-breakpoint
CREATE TYPE "public"."alert_frequency" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."commission_model" AS ENUM('unknown', 'contributor_recruitment', 'business_client_referral', 'product_sales', 'personal_referral', 'none');--> statement-breakpoint
CREATE TYPE "public"."discovery_group_kind" AS ENUM('pathway', 'category_tab', 'subsection');--> statement-breakpoint
CREATE TYPE "public"."intake_status" AS ENUM('new', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."readiness_level" AS ENUM('A', 'B', 'C', 'D', 'E');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('broken_link', 'expired', 'incorrect_pay', 'incorrect_location', 'registration_closed', 'suspicious', 'undisclosed_costs', 'misleading', 'other');--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"category_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"search_query" text,
	"frequency" "alert_frequency" DEFAULT 'weekly' NOT NULL,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_subscriptions_email_unique" UNIQUE("email"),
	CONSTRAINT "alert_subscriptions_unsubscribeToken_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "alert_subscriptions_email_len" CHECK (char_length("alert_subscriptions"."email") <= 254)
);
--> statement-breakpoint
CREATE TABLE "discovery_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "discovery_group_kind" NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"accent" text,
	"includes" text[] DEFAULT '{}'::text[] NOT NULL,
	"subcategory_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"category_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_groups_kind_slug_key" UNIQUE NULLS NOT DISTINCT("kind","category_id","slug"),
	CONSTRAINT "discovery_groups_slug_format" CHECK ("discovery_groups"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "discovery_groups_tab_category" CHECK (("discovery_groups"."kind" = 'category_tab') = ("discovery_groups"."category_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"opportunity_id" uuid,
	"provider_id" uuid,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"contact_email" text,
	"status" "intake_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_reports_details_len" CHECK (char_length(coalesce("listing_reports"."details", '')) <= 2000)
);
--> statement-breakpoint
CREATE TABLE "opportunity_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid,
	CONSTRAINT "opportunity_categories_key" UNIQUE NULLS NOT DISTINCT("opportunity_id","category_id","subcategory_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_groups" (
	"opportunity_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "opportunity_groups_opportunity_id_group_id_pk" PRIMARY KEY("opportunity_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "provider_internal" (
	"provider_id" uuid PRIMARY KEY NOT NULL,
	"commission_model" "commission_model" DEFAULT 'unknown' NOT NULL,
	"commission_text" text,
	"commission_currency" text,
	"qualifying_action" text,
	"tracking_window" text,
	"recurring_commission" boolean,
	"source_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"readiness_level" "readiness_level",
	"approval_status" text,
	"mission_alignment" text,
	"business_contact" text,
	"last_reviewed_at" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"website_url" text NOT NULL,
	"contact_name" text,
	"contact_email" text NOT NULL,
	"category_slug" text,
	"notes" text,
	"status" "intake_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_submissions_website_https" CHECK ("provider_submissions"."website_url" ~ '^https?://'),
	CONSTRAINT "provider_submissions_notes_len" CHECK (char_length(coalesce("provider_submissions"."notes", '')) <= 2000)
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "url_template" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "compensation_type" "compensation_type" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "pay_min_cents" integer;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "pay_max_cents" integer;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "pay_period" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "commission_basis" "commission_basis";--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "commission_recurring" boolean;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "reimbursement_item" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "reimbursement_max_cents" integer;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "compensation_note" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "estimated_minutes" integer;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "what_you_will_do" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "eligibility" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "payment_details" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "last_verified_at" date;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "last_verified_at" date;--> statement-breakpoint
ALTER TABLE "discovery_groups" ADD CONSTRAINT "discovery_groups_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_categories" ADD CONSTRAINT "opportunity_categories_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_categories" ADD CONSTRAINT "opportunity_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_categories" ADD CONSTRAINT "opportunity_categories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_groups" ADD CONSTRAINT "opportunity_groups_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_groups" ADD CONSTRAINT "opportunity_groups_group_id_discovery_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."discovery_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_internal" ADD CONSTRAINT "provider_internal_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_reports_status_idx" ON "listing_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_categories_category_idx" ON "opportunity_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "provider_submissions_status_idx" ON "provider_submissions" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_currency" CHECK ("opportunities"."currency" is null or "opportunities"."currency" in ('USD','CAD'));--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pay_nonneg" CHECK (coalesce("opportunities"."pay_min_cents", 0) >= 0 and coalesce("opportunities"."pay_max_cents", 0) >= 0 and coalesce("opportunities"."reimbursement_max_cents", 0) >= 0);--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pay_order" CHECK ("opportunities"."pay_min_cents" is null or "opportunities"."pay_max_cents" is null or "opportunities"."pay_min_cents" <= "opportunities"."pay_max_cents");--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_estimated_minutes" CHECK ("opportunities"."estimated_minutes" is null or "opportunities"."estimated_minutes" between 1 and 10080);