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
| `user`, `session`, `account`, `verification`, `two_factor` | Better Auth. Admin role = `user.role = 'admin'` (replaces the earlier `profiles` idea) |

## Roles & RLS (summary; details in SECURITY.md)
- `app_runtime`: SELECT active categories/subcategories, published non-demo providers/opportunities; full access to auth tables; EXECUTE `resolve_outbound_link`.
- `app_admin`: CRUD on content tables, read clicks, insert/read audit log, read limited `user` columns.
- Demo rows are visible only when the transaction sets `app.show_demo = 'on'`.

## Planned columns (design specs; not yet migrated)
The UI already supports these via `src/lib/missions/types.ts`; DB listings currently render as
provider-level cards with "See provider details" until the columns exist.

| Table | Planned column | Type | Notes |
| --- | --- | --- | --- |
| opportunities | `compensation_type` | enum: fixed, range, hourly, variable, reimbursement_only, payment_plus_reimbursement, commission, hybrid, non_cash, unknown | default `unknown` |
| opportunities | `pay_min_cents`, `pay_max_cents`, `currency` | int, int, enum USD/CAD | verified amounts only |
| opportunities | `reimbursement_item`, `reimbursement_max_cents` | text, int | never added to pay |
| opportunities | `commission_recurring` | boolean null | |
| opportunities | `non_cash_label` | text | e.g. "Gift card rewards" |
| opportunities | `duration_minutes` | int null | |
| opportunities | `attributes` | jsonb | remote, online, inPerson, smartphoneRequired, computerRequired, purchaseRequired, reimbursementAvailable, beginnerFriendly, portfolioRequired, audienceRequired, applicationRequired, assessmentRequired, performanceBased, recurringCommission (absent = unknown) |
| opportunities | `creator_requirements` | jsonb | label/value pairs |
| opportunities | `what_you_will_do`, `eligibility`, `payment_details`, `terms` | text[] | |
| opportunity_locations (new) | country, region, city | | location-bound missions; RLS like opportunities |
| pathways / category_tabs (new) | | | move `taxonomy.ts` groupings into admin-managed tables (update §17) |

## Seed
`npm run db:seed` seeds categories + 3 demo providers (example.com URLs, `is_demo = true`).
Neon `main` was seeded with **categories only** (the founder's 8, 62 subcategories). Neon `preview` also has 3 legacy demo providers (hidden from the feed; the richer demo set lives in code).

## Changing the schema
1. Edit `src/db/schema/*`. 2. `npm run db:generate`. 3. For grants/RLS write a custom migration
(`npx drizzle-kit generate --custom --name ...`). 4. Test locally, then apply to a Neon branch before `main`.
New tables MUST enable RLS and add grants/policies in the same migration.
