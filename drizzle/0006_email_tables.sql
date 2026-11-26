CREATE TYPE "public"."email_frequency" AS ENUM('daily', 'weekly', 'alerts', 'website_only');--> statement-breakpoint
CREATE TYPE "public"."email_send_status" AS ENUM('queued', 'sent', 'failed', 'skipped', 'dry_run');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'active', 'unsubscribed', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('any', 'remote', 'local');--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text,
	"type" text NOT NULL,
	"send_id" uuid,
	"resend_id" text,
	"email" text,
	"opportunity_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_events_externalId_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid,
	"email" text NOT NULL,
	"campaign" text NOT NULL,
	"send_key" text NOT NULL,
	"status" "email_send_status" DEFAULT 'queued' NOT NULL,
	"subject" text,
	"items" text[] DEFAULT '{}'::text[] NOT NULL,
	"resend_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "email_sends_sendKey_unique" UNIQUE("send_key")
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"sending_paused" boolean DEFAULT true NOT NULL,
	"daily_limit" integer DEFAULT 90 NOT NULL,
	"monthly_limit" integer DEFAULT 2900 NOT NULL,
	"batch_size" integer DEFAULT 50 NOT NULL,
	"campaigns" jsonb DEFAULT '{"daily8": true, "weekly8": true, "alerts": false, "confirm": true}'::jsonb NOT NULL,
	"plan_name" text DEFAULT 'Free (verify in Resend)' NOT NULL,
	"plan_monthly_quota" integer DEFAULT 3000 NOT NULL,
	"plan_monthly_cost_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"alert_threshold_pct" integer DEFAULT 80 NOT NULL,
	"sender_name" text DEFAULT '8Tasks.com' NOT NULL,
	"postal_address" text,
	"reply_to" text,
	"weekly_day" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_settings_singleton" CHECK ("email_settings"."id" = 1),
	CONSTRAINT "email_settings_weekday" CHECK ("email_settings"."weekly_day" between 0 and 6),
	CONSTRAINT "email_settings_limits" CHECK ("email_settings"."daily_limit" >= 0 and "email_settings"."monthly_limit" >= 0 and "email_settings"."batch_size" between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"frequency" "email_frequency" DEFAULT 'daily' NOT NULL,
	"country" text,
	"region" text,
	"city" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"creative_interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"work_mode" "work_mode" DEFAULT 'any' NOT NULL,
	"beginner_only" boolean DEFAULT false NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"compensation_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"search_query" text,
	"time_zone" text DEFAULT 'America/Vancouver' NOT NULL,
	"send_hour" integer DEFAULT 8 NOT NULL,
	"consent_text" text NOT NULL,
	"consent_version" text NOT NULL,
	"consent_source" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirm_token" uuid DEFAULT gen_random_uuid(),
	"confirmed_at" timestamp with time zone,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "email_subscribers_token_unique" UNIQUE("token"),
	CONSTRAINT "email_subscribers_email_len" CHECK (char_length("email_subscribers"."email") <= 254),
	CONSTRAINT "email_subscribers_send_hour" CHECK ("email_subscribers"."send_hour" between 0 and 23),
	CONSTRAINT "email_subscribers_country" CHECK ("email_subscribers"."country" is null or "email_subscribers"."country" in ('CA','US'))
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"email" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "allows_email_traffic" "capability" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_send_id_email_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."email_sends"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_subscriber_id_email_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."email_subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_events_type_time_idx" ON "email_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "email_sends_created_idx" ON "email_sends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_sends_subscriber_idx" ON "email_sends" USING btree ("subscriber_id","created_at");--> statement-breakpoint
CREATE INDEX "email_sends_resend_idx" ON "email_sends" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "email_subscribers_status_idx" ON "email_subscribers" USING btree ("status","frequency");