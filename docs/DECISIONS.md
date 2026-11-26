# Decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-25 | **No Supabase.** Postgres on **Neon** (new project `8tasks`) | Founder decision. Neon: managed serverless Postgres, Vercel integration, branching, free tier for MVP (paid plans usage-based; check pricing before upgrading) |
| 2026-11-25 | **Better Auth** for admin auth | Free/OSS, stores data in our Postgres, built-in TOTP two-factor and admin role. Replaces Supabase Auth |
| 2026-11-25 | **Drizzle ORM** + plain SQL migrations | Lightweight, TypeScript-first, custom SQL migrations for RLS |
| 2026-11-25 | Authorization via separate DB login roles (`app_runtime`, `app_admin`) + RLS | Without Supabase's JWT-based RLS, role separation gives real least privilege rather than spoofable session flags |
| 2026-11-25 | Admin role on Better Auth `user.role`; no `profiles` table | Avoid duplicating user data |
| 2026-11-25 | `/go/[id]` takes an **opportunity** id; DB function resolves + logs atomically | Keeps affiliate URLs unreadable to the public role |
| 2026-11-25 | node-postgres (`pg`) driver for both local and Neon | One driver everywhere; Vercel Node runtime supports TCP. Revisit Neon serverless driver if edge runtime is needed |
| 2026-11-25 | shadcn/ui components copied by hand | ui.shadcn.com registry is blocked in the build container; same source and deps |
| 2026-11-25 | Proposed 8 categories (see `scripts/seed-data.ts`) | Pending blueprint confirmation |
| 2026-11-26 | Hero artwork **approved**: coded phone illustration with survey + usability-test cards (`src/components/site/hero-illustration.tsx`), desktop only | Founder approval. Coded rather than a photo: sharp, theme-matched, no fabricated numbers |

## Open (founder)
- Confirm the 8 categories / subcategories
- Add `docs/PROJECT_BLUEPRINT.md`
- Hosting (Vercel recommended), launch market (CA+US vs US first), branding
- Neon compute: project was created with min/max 1 CU; consider 0.25 CU min + scale-to-zero to cut cost
