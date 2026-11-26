# Changelog

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
