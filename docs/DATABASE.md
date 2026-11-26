# Database

Postgres 17 on Neon: project **`8tasks`** (`purple-firefly-62820848`), region aws-us-west-2,
branch `main`, database `eighttasks`, owner role `eighttasks_owner`. Local dev uses Postgres 16.

Migrations live in `drizzle/` and are tracked in `drizzle.__drizzle_migrations`.
0000–0003 have been applied to Neon `main` and `preview`; 0000 and 0001 were first applied to Neon `main` (via the Neon MCP connector, with hashes recorded,
so `drizzle-kit migrate` will treat them as done).

## Tables
| Table | Notes |
| --- | --- |
| `categories` | 8 seeded, admin-configurable. `slug`, `icon` (lucide name), `sort_order`, `is_active` |
| `subcategories` | Per category; unique `(category_id, slug)` |
| `providers` | Public profile + affiliate facts (`supports_sub_ids`, `supports_postbacks`, `provides_feed`, `allows_revenue_share`: enum `unknown/yes/no`, default `unknown`). `admin_notes` hidden from public role. `status` draft/published/archived. `is_demo` |
| `affiliate_links` | Admin-stored tracking URLs (must match `^https://\S+$`). Not readable by public role |
| `opportunities` | Listings per provider + category; optional `affiliate_link_id`; `data_source` (`provider_level` default; `authorized_feed`/`authorized_manual` for individual missions); `is_sponsored`; `is_demo`. No payout columns until authorized data exists |
| `outbound_clicks` | Written only by `resolve_outbound_link()`. No IPs. `source_path`, `country`, `device_type`, `is_bot` |
| `admin_audit_log` | Append-only (UPDATE/DELETE/TRUNCATE blocked by trigger) |
| `affiliate_programs` | Admin-only registry: `id` slug, `network`, `network_campaign_id`, `payout_method`, `currency_default`, `affiliate_url`, `data_method`, `status` (live/pending_signup/waiting_for_site/paused/not_in_scope), `notes` |
| `affiliate_transactions` | Admin-only source of truth for 8Tasks affiliate earnings: `type` (conversion/adjustment/payout/summary), `status` (pending/approved/paid/reversed), signed `commission_amount`, `currency`, `source`, unique `(program_id, source, external_id)` when external_id is set |
| `affiliate_sync_runs` | Log of each sync / import / postback batch |
| `provider_internal` | Admin-only commercial terms per provider (commission model/text/currency, qualifying action, tracking window, recurring, source URLs, readiness A–E, approval status, alignment, business contact). No app_runtime grant |
| `discovery_groups` | Pathways, category tabs, /earn subsections: `kind`, `slug`, `category_id` (tabs only), title, description, icon, accent, `includes[]`, `subcategory_slugs[]`, `category_slugs[]`, sort, active. Public read when active |
| `opportunity_categories` | Secondary category/subcategory per opportunity (one record, many categories). Public read follows opportunity visibility |
| `opportunity_groups` | Explicit opportunity ↔ group membership |
| `listing_reports`, `provider_submissions` | Public intake: app_runtime INSERT only (status must be `new`, no admin note); admin reviews |
| `alert_subscriptions` | Free alert opt-ins with consent text/time and unsubscribe token. Written only via `subscribe_alerts()` / `unsubscribe_alerts()` (SECURITY DEFINER); admin read |
| `email_subscribers` | Opt-in subscribers: status (pending/active/unsubscribed/bounced/complained), frequency, preferences, time zone + send hour, consent text/version/source/time, confirm token, manage token. Token functions only for the public |
| `email_sends` | One row per intended email; unique `send_key`; status queued/sent/failed/skipped/dry_run; items; Resend id |
| `email_events` | Resend webhook events (idempotent on svix id) and our click events |
| `email_suppressions` | Never-email list (bounce/complaint/manual) |
| `email_settings` | Singleton: pause (default on), limits, batch, campaigns, plan quota/cost, sender name/address, reply-to, weekly day |
| `user`, `session`, `account`, `verification`, `two_factor` | Better Auth. Admin role = `user.role = 'admin'` (replaces the earlier `profiles` idea) |

## Roles & RLS (summary; details in SECURITY.md)
- `app_runtime`: SELECT active categories/subcategories, published non-demo providers/opportunities; full access to auth tables; EXECUTE `resolve_outbound_link`.
- `app_admin`: CRUD on content tables, read clicks, insert/read audit log, read limited `user` columns.
- Demo rows are visible only when the transaction sets `app.show_demo = 'on'`.

## Opportunity detail columns (migration 0004)
`compensation_type` (enum incl. non-cash types), `pay_min_cents`, `pay_max_cents`, `currency` (USD/CAD), `pay_period`
(unit, e.g. "audio hour"), `commission_basis`, `commission_recurring`, `reimbursement_item`, `reimbursement_max_cents`,
`compensation_note`, `estimated_minutes`, `attributes` jsonb (absent key = unknown), `what_you_will_do[]`,
`eligibility[]`, `payment_details[]`, `deadline_at` (null = ongoing; past = closed), `last_verified_at`, `is_featured`.
`providers.last_verified_at` (public). `affiliate_links.url_template` (unused until the creator program).
Still planned: `opportunity_locations` (country/region/city) for location-bound missions.

## Migrations 0010–0012 (accounts, free listings)
- 0010/0011: `user_profiles`, `user_saved_items`, `user_saved_searches`, `user_missions`, `user_earnings` (cents,
  USD/CAD, self-reported), `email_subscribers.user_id`. RLS: `app_runtime` sees only rows where
  `user_id = app_user_id()` (`app.user_id`, set per transaction by `withUserDb` after the session is verified); admins
  have no access. Functions: `email_account_get/subscribe/unsubscribe`, `delete_my_account` (refuses admins).
- 0012: `affiliate_links.is_affiliate` (default true) + `link_is_affiliate(uuid)` (public flag only).
- Listings import: see CHANGELOG 2026-11-26 and `scripts/import-listings.ts`.

## Seed
`npm run db:seed` seeds categories + 3 demo providers (example.com URLs, `is_demo = true`).
Neon `main` was seeded with **categories only** (the founder's 8, 62 subcategories). Neon `preview` also has 3 legacy demo providers (hidden from the feed; the richer demo set lives in code).

## Changing the schema
1. Edit `src/db/schema/*`. 2. `npm run db:generate`. 3. For grants/RLS write a custom migration
(`npx drizzle-kit generate --custom --name ...`). 4. Test locally, then apply to a Neon branch before `main`.
New tables MUST enable RLS and add grants/policies in the same migration.
