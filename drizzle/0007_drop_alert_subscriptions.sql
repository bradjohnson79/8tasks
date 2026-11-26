-- Replaced by email_subscribers (double opt-in, consent records). The old table was never used in production.
DROP FUNCTION IF EXISTS subscribe_alerts(text, text[], text, alert_frequency, text);--> statement-breakpoint
DROP FUNCTION IF EXISTS unsubscribe_alerts(uuid);--> statement-breakpoint
DROP TABLE "alert_subscriptions" CASCADE;--> statement-breakpoint
DROP TYPE "public"."alert_frequency";--> statement-breakpoint
DROP TYPE "public"."alert_status";