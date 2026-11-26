CREATE TYPE "public"."earning_status" AS ENUM('expected', 'received');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('new', 'some', 'experienced');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('interested', 'applied', 'in_progress', 'completed', 'not_pursuing');--> statement-breakpoint
CREATE TABLE "user_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"activity" text,
	"earned_on" date NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"expenses_cents" integer DEFAULT 0 NOT NULL,
	"reimbursement_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "earning_status" DEFAULT 'expected' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_earnings_currency" CHECK ("user_earnings"."currency" in ('USD','CAD')),
	CONSTRAINT "user_earnings_amounts" CHECK ("user_earnings"."amount_cents" between 0 and 100000000 and "user_earnings"."expenses_cents" between 0 and 100000000 and "user_earnings"."reimbursement_cents" between 0 and 100000000)
);
--> statement-breakpoint
CREATE TABLE "user_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" uuid,
	"provider_name" text NOT NULL,
	"title" text NOT NULL,
	"status" "mission_status" DEFAULT 'interested' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_missions_len" CHECK (char_length("user_missions"."title") <= 160 and char_length(coalesce("user_missions"."notes", '')) <= 2000)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"country" text,
	"region" text,
	"city" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"creative_interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"work_mode" "work_mode" DEFAULT 'any' NOT NULL,
	"beginner_only" boolean DEFAULT false NOT NULL,
	"experience_level" "experience_level",
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"compensation_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"time_zone" text DEFAULT 'America/Vancouver' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_country" CHECK ("user_profiles"."country" is null or "user_profiles"."country" in ('CA','US'))
);
--> statement-breakpoint
CREATE TABLE "user_saved_items" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_items_user_id_item_id_pk" PRIMARY KEY("user_id","item_id"),
	CONSTRAINT "user_saved_items_id" CHECK (char_length("user_saved_items"."item_id") <= 80)
);
--> statement-breakpoint
CREATE TABLE "user_saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"q" text,
	"filters" text[] DEFAULT '{}'::text[] NOT NULL,
	"path" text,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_subscribers" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "user_earnings" ADD CONSTRAINT "user_earnings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_items" ADD CONSTRAINT "user_saved_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_searches" ADD CONSTRAINT "user_saved_searches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_earnings_user_idx" ON "user_earnings" USING btree ("user_id","earned_on");--> statement-breakpoint
CREATE INDEX "user_missions_user_idx" ON "user_missions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_saved_searches_user_idx" ON "user_saved_searches" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "email_subscribers" ADD CONSTRAINT "email_subscribers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;