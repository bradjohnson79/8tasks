# Changelog

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
