# Changelog

## 2026-11-27: Production rollout of PR #2 (founder "go")
- Recovery branch `backup-before-pr2-2026-11-27` (br-small-queen-akb4whxo) created from Neon main first.
- Neon main: migrations 0010–0012 applied (13 rows; 0000–0009 hashes matched the repo). PR #2 merged (b5a6185),
  production deploy dpl_J9vUtuXvTQuezC1DMsVt5rGq53eP READY on 8tasks.com.
- Listings: production dry run on a copy of main matched preview (25 created, 2 updated, 25 links, 0 published without
  the flag); applied with a checksum guard (6bb0fbb6…). Dreamstime + JoinBrands published (readiness A, CA + US, exact
  URLs). 24 independent (Level D) listings published after founder review; RWS TrainAI kept as draft (its URL is a
  client services page, not a rater signup page). OnlineBookClub and Groover not added (official pages could not be
  verified from the build environment). JoinBrands also in Review & Earn and Promote & Earn with founder-approved wording.
- Public label "Independent listing" + "8Tasks does not currently receive a commission from this listing."; footer
  "8Tasks is always free to use. We may earn a commission from qualifying referrals to participating providers.";
  unknown pay shows "Check provider for current rates".

## 2026-11-26: First real listings + optional free accounts (preview only; awaiting "go")
- **Listings import** (`CLAUDE_LISTINGS_PROMPT.md`): `npm run listings:import -- --file <path> [--include-free-drafts]
  [--dry-run] [--publish-affiliate]` and `/admin/import` (also at `/admin/listings/import`, linked from Providers) accept
  the founder's `listings_phase1.json` / `.csv` (`src/lib/import/listings-v1.ts`). Idempotent: providers by slug, links by
  exact URL, opportunities by (provider, slug), adopting a renamed provider-level listing in the same category instead of
  duplicating it. Re-imports never change `status` or admin notes, only fill empty internal facts, merge attributes, and
  never remove placements set in /admin. Audit row per entity. `listings_pending_review.csv` is rejected.
- Migration 0012: `affiliate_links.is_affiliate` (false = free listing's official site; /go still validates + logs) and
  `link_is_affiliate()` so public pages learn only the flag. Free listings show a "Free listing" badge, the
  free-listing note instead of the affiliate disclosure, "Visit official site" and no pay. Publish policy counts only
  affiliate links (free official links don't block Level D user-value listings).
- Create & Earn pathway page has subsection tabs (Capture, Write, Film, Review, Promote) from `discovery_groups`.
- Neon preview: migrations 0010–0012 applied; Dreamstime + JoinBrands published (exact URLs, CA + US), 25 free listings
  as drafts. Production untouched.
- **Optional free accounts** (addendum, Phases 1–2): magic-link email sign-in (+ Google when `GOOGLE_CLIENT_ID/SECRET`
  are set), admin accounts can only sign in with password + TOTP; "Choose your adventure" onboarding (skippable);
  dashboard; saved items/searches synced from the device; personalized on-site Daily 8; Email & Alerts (account creation
  never subscribes; explicit consent recorded); My Missions and My Earnings (self-reported, CSV); JSON data export;
  account deletion; per-user RLS (`app.user_id`, migrations 0010–0011). Promotional partners (Phase 3) not built.

## 2026-11-26: Founder gap analysis + real integration package + full link map
- `data/site_links.json` rebuilt from the founder's 86-row link map via `scripts/build-site-links.ts` (commercial
  fields removed: public repo). For Brands still shows only live + for_brands_page rows (JoinBrands).
- Import accepts the founder's `claude_integration_package.json` format directly (`src/lib/import/package-v1.ts`):
  annotations stripped, unknown/"sometimes" facts dropped, internal context to admin notes. Dreamstime + JoinBrands
  re-imported as drafts (local + preview) from the real package (JoinBrands CA + US, extra subcategories/subsections).
- G-30: providers publish only at readiness A, or D as a flagged user-value listing with no affiliate links (0009).
- G-04: search matches secondary categories and /earn subsection names. G-24: Organization JSON-LD. G-35: CI workflow in `.github/workflows/ci.yml` (moved from docs/ci-workflow.yml).

## 2026-11-26: Resend + My Daily 8 email (sending off until approved)
- Migrations 0006–0008: `email_subscribers` (double opt-in, consent records, preferences, tokens), `email_sends`,
  `email_events`, `email_suppressions`, `email_settings`; `providers.allows_email_traffic`; token-based SECURITY DEFINER
  functions. Replaces the unused `alert_subscriptions`. Applied locally + Neon preview only.
- Rules-based Daily 8 recommender (never padded, skips when nothing fits), React Email templates (HTML + text),
  hourly idempotent scheduler, signed Resend webhook (bounces/complaints → suppression), one-click unsubscribe,
  click tracking via internal redirect, `/daily-8` sign-up, confirm/preferences/unsubscribe pages, `/admin/email`.
- 8tasks.com added as a sending domain in Resend (DNS pending). See `docs/EMAIL.md`.

## 2026-11-26: Master prompt (provider integration & feature update), PR for review
- Migrations 0004 (columns/tables) + 0005 (RLS, grants, alert functions, seeds). Applied locally and to Neon **preview** only.
- Verified compensation, attribute, deadline, last-verified and editor's-pick columns on opportunities; non-cash types
  (gift_card, free_product, competition_prize, licensing_royalties) never shown or sorted as cash.
- One record in many places: `opportunity_categories` (secondary categories) and `opportunity_groups` (subsections/pathways).
- Pathways, category tabs and /earn subsections moved to the admin-managed `discovery_groups` table (`/admin/discovery`); defaults unchanged visually.
- 22 new subcategories (CoffeeModes subsections, photography/content/testing/microtasks additions).
- Admin: provider commercial terms in admin-only `provider_internal`, opportunity compensation/attributes/placement,
  provider import with preview (always drafts), inbox for reports/submissions/alert subscribers.
- Public: `/earn/[subsection]`, "Explore Opportunity" CTA, New This Week (7 days), Ending Soon, Editor's Picks, closed
  listings (auto-closed at deadline, `/go` refuses), Last verified dates, report form, `/submit-provider`, free alerts
  opt-in (`/alerts`, nothing sent yet), device-local saved searches, About/Contact/Press, `/legal/free-access`,
  "Always Free. For Everyone." in the footer, sitemap/robots/OG image/canonical URLs.
- Paywall guard test; fragment-preservation tests; DB integration tests (RLS + drafts).
- Dreamstime and JoinBrands loaded as drafts (local + preview) from `data/import/claude_integration_package.json`.

## 2026-11-26: Affiliate earnings feed, For Brands, Staff Admin
- Migrations 0002/0003: `affiliate_programs`, `affiliate_transactions`, `affiliate_sync_runs` (admin-only RLS),
  `record_affiliate_postback()`, `affiliate_links.subid_param`, `outbound_clicks.click_id`; applied to Neon main + preview.
- 30-program registry seeded on Neon main + preview (2 live, 5 pending_signup, 16 waiting_for_site, 1 paused, 6 not_in_scope).
- `/admin/earnings`: totals by currency, earning vs configured-but-quiet, period picker, last synced; manual entry,
  CSV import + template, programs registry.
- Postback endpoint, cron sync route + no-op connectors, SubID click wrapper.
- `/for-brands` page from `data/site_links.json`; footer links "For Brands" and "Staff Admin" (→ `/admin/login`).
- `/admin/account`: change password (revokes other sessions). Founder admin `8tasks@proton.me` created on Neon main + preview
  with a temporary password (must enrol TOTP on first sign-in, then change the password).

## 2026-11-26: Production launch
- Founder-approved production deploy of `main` to Vercel; 8tasks.com + www.8tasks.com added to the project.
- Production env vars (runtime/admin DB roles on Neon `main`, auth secret, BETTER_AUTH_URL=https://8tasks.com). Demo data is off in production.

## 2026-11-26: Hero artwork restored
- Founder exception: phone artwork back in the homepage hero on wide screens, restyled to the dark design system, static.

## 2026-11-26: Mobile-first design system + discovery update
- Implemented the founder's design specification and enhancement update (see docs/DESIGN_SYSTEM.md):
  dark tokens, Inter, wordmark, sticky 64px header, five-destination bottom nav (desktop: header nav),
  search, My Daily 8 card, "How do you want to earn?" pathways, 8-category grid, filter chips, grouped
  filters, mission cards with flexible compensation, detail pages with reimbursement breakdown and sticky CTA.
- New routes: `/missions` (search, pathways, filters), `/missions/[id]`, `/daily-8`, `/saved` (device),
  `/earnings`, `/profile`, `/notifications`; category pages gained tabs and "Find missions near you".
- Categories replaced with the founder's 8 (+ expanded Content & Media and Mystery Shopping subcategories)
  on local, Neon `main` and Neon `preview`.
- Vercel: preview deployment of this branch with preview-only env vars and Neon `preview` branch.
- Tests: compensation wording, filters (unknown never matches), pathways, search, location, demo isolation
  (56 unit tests). Viewport sweep at 320–1920px: no overflow, no JS errors.

## 2026-11-26: Provider pages, admin panel, CA/US market
- Public: provider profile pages, provider list links, CA · US badges, opportunity cards link to the provider.
- Launch market Canada + US enforced in admin validation and public queries (`src/lib/markets.ts`).
- Categories: added **Photo Scouting**; merged Micro Tasks into AI Training & Data Tasks (local + Neon).
- Admin: `/admin/login` (email/password + TOTP), mandatory 2FA enrolment with QR + backup codes,
  overview, providers (+ affiliate links, 30-day click counts), opportunities, categories/subcategories,
  audit log. Every mutation: `requireAdmin()` → Zod → app_admin transaction + audit row.
- `npm run admin:create` bootstrap script; `npm run test:e2e` local Playwright admin flow.
- Public pages moved into a `(site)` route group so admin has its own layout.
- Fixed: subquery column ambiguity in admin link counts; forms no longer clear input on error;
  removed site-wide cache revalidation after admin saves (it 404'd the prerendered legal pages).

## 2026-11-26: Hero artwork
- Added the approved hero illustration (phone + survey and usability-test cards) on large screens; gentle float animation, off under reduced motion.

## 2026-11-26: Foundation (first session)
- Next.js 15 + TypeScript strict + Tailwind v4 + shadcn/ui (new-york, hand-copied components).
- Switched from Supabase to **Neon + Drizzle + Better Auth** (founder decision).
- Migrations `0000_init` (tables) and `0001_rls_and_guards` (roles, grants, RLS on all 12 tables,
  updated_at triggers, append-only audit log, `resolve_outbound_link`). Applied locally and to Neon `main`.
- Seeded 8 proposed categories + 22 subcategories (Neon and local); 3 demo providers locally only.
- Homepage (hero, categories, how it works, disclosure), category pages, providers list,
  `/go/[id]` redirect with click logging, placeholder legal pages, dev-only demo banner.
- Light/dark mode via OS preference; mobile sheet navigation.
- Vitest unit tests (12) for demo gating, admin policy, redirect metadata, seed-data invariants.
