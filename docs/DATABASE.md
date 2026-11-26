# Database

Postgres 17 on Neon: project **`8tasks`** (`purple-firefly-62820848`), region aws-us-west-2,
branch `main`, database `eighttasks`, owner role `eighttasks_owner`. Local dev uses Postgres 16.

Migrations live in `drizzle/` and are tracked in `drizzle.__drizzle_migrations`.
Both 0000 and 0001 have been applied to Neon `main` (via the Neon MCP connector, with hashes recorded,
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
| `user`, `session`, `account`, `verification`, `two_factor` | Better Auth. Admin role = `user.role = 'admin'` (replaces the earlier `profiles` idea) |

## Roles & RLS (summary; details in SECURITY.md)
- `app_runtime`: SELECT active categories/subcategories, published non-demo providers/opportunities; full access to auth tables; EXECUTE `resolve_outbound_link`.
- `app_admin`: CRUD on content tables, read clicks, insert/read audit log, read limited `user` columns.
- Demo rows are visible only when the transaction sets `app.show_demo = 'on'`.

## Seed
`npm run db:seed` seeds categories + 3 demo providers (example.com URLs, `is_demo = true`).
Neon `main` was seeded with **categories only**. Category list is proposed, pending the blueprint.

## Changing the schema
1. Edit `src/db/schema/*`. 2. `npm run db:generate`. 3. For grants/RLS write a custom migration
(`npx drizzle-kit generate --custom --name ...`). 4. Test locally, then apply to a Neon branch before `main`.
New tables MUST enable RLS and add grants/policies in the same migration.
