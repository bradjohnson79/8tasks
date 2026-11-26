CREATE TYPE "public"."affiliate_program_status" AS ENUM('live', 'pending_signup', 'waiting_for_site', 'paused', 'not_in_scope');--> statement-breakpoint
CREATE TYPE "public"."affiliate_tx_source" AS ENUM('impact_api', 'awin_api', 'cj_api', 'flexoffers_api', 'daisycon_api', 'postback', 'csv_import', 'manual');--> statement-breakpoint
CREATE TYPE "public"."affiliate_tx_status" AS ENUM('pending', 'approved', 'paid', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."affiliate_tx_type" AS ENUM('conversion', 'adjustment', 'payout', 'summary');--> statement-breakpoint
CREATE TABLE "affiliate_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"network" text NOT NULL,
	"network_campaign_id" text,
	"payout_method" text,
	"currency_default" text,
	"affiliate_url" text,
	"data_method" text,
	"docs_url" text,
	"status" "affiliate_program_status" DEFAULT 'pending_signup' NOT NULL,
	"provider_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_programs_id_format" CHECK ("affiliate_programs"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "affiliate_programs_network" CHECK ("affiliate_programs"."network" in ('direct','impact','awin','cj','flexoffers','daisycon','maxbounty','offerjuice','undecided')),
	CONSTRAINT "affiliate_programs_currency" CHECK ("affiliate_programs"."currency_default" is null or "affiliate_programs"."currency_default" ~ '^[A-Z]{3}$'),
	CONSTRAINT "affiliate_programs_url_https" CHECK ("affiliate_programs"."affiliate_url" is null or "affiliate_programs"."affiliate_url" ~ '^https://')
);
--> statement-breakpoint
CREATE TABLE "affiliate_sync_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"rows_upserted" integer DEFAULT 0 NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "affiliate_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" text NOT NULL,
	"network" text NOT NULL,
	"external_id" text,
	"type" "affiliate_tx_type" NOT NULL,
	"status" "affiliate_tx_status" NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"posted_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"clicks" integer,
	"conversions" integer,
	"sale_amount" numeric(14, 2),
	"commission_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text NOT NULL,
	"sub_id" text,
	"click_id" text,
	"payout_method" text,
	"payout_external_id" text,
	"raw" jsonb,
	"source" "affiliate_tx_source" NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_by" text,
	CONSTRAINT "affiliate_tx_currency" CHECK ("affiliate_transactions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "affiliate_tx_counts" CHECK (coalesce("affiliate_transactions"."clicks", 0) >= 0 and coalesce("affiliate_transactions"."conversions", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "subid_param" text;--> statement-breakpoint
ALTER TABLE "outbound_clicks" ADD COLUMN "click_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_transactions" ADD CONSTRAINT "affiliate_transactions_program_id_affiliate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."affiliate_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_transactions" ADD CONSTRAINT "affiliate_transactions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_sync_runs_source_idx" ON "affiliate_sync_runs" USING btree ("source","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_tx_external_key" ON "affiliate_transactions" USING btree ("program_id","source","external_id") WHERE "affiliate_transactions"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "affiliate_tx_program_event_idx" ON "affiliate_transactions" USING btree ("program_id","event_at");--> statement-breakpoint
CREATE INDEX "affiliate_tx_click_idx" ON "affiliate_transactions" USING btree ("click_id");--> statement-breakpoint
ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_clickId_unique" UNIQUE("click_id");