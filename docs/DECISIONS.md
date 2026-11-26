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
| 2026-11-26 | Hero artwork **approved**: coded phone illustration with survey + usability-test cards (`src/components/site/hero-illustration.tsx`), desktop only | Founder approval. Coded rather than a photo: sharp, theme-matched, no fabricated numbers |
| 2026-11-26 | **Launch market: Canada + US only.** Admin forms only accept CA/US; public queries only show rows whose countries include CA or US; badges show CA · US | Founder decision. Expansion = add codes to `SUPPORTED_COUNTRIES` in `src/lib/markets.ts` |
| 2026-11-26 | **Photo Scouting** category added (storefronts & locations, shelf checks, product photos). **Micro Tasks merged into AI Training & Data Tasks** to keep exactly 8 categories | Founder decision; brand = 8 categories. Merge handled by `RETIRED_CATEGORIES` in the seed and applied to Neon |
| 2026-11-26 | Admin records are archived/deactivated, not deleted | Preserves click history and FK integrity; audit trail stays meaningful |
| 2026-11-26 | Opportunities can't be published without an affiliate link from the same provider | Prevents dead "Visit provider" buttons and cross-provider link mix-ups |
| 2026-11-26 | Admin forms submit via a client wrapper (no auto-reset) | Keeps typed input when validation fails |
| 2026-11-26 | **Vercel** hosting (project `8tasks`, team anoint). Production branch `main`; previews use Neon branch `preview` with preview-only env vars | Founder set up Vercel; production deploys still need explicit approval |
| 2026-11-26 | **Design specification adopted**: dark-only tokens, Inter, mobile bottom nav, discovery-first homepage | Founder specs. Supersedes the earlier hero artwork (spec avoids hero banners and floating graphics); `hero-illustration.tsx` removed |
| 2026-11-26 | **Categories = founder's 8**: Surveys, App & Website Testing, Photography, Mystery Shopping, Content & Media, Gaming & Entertainment, Paid Research, Microtasks & AI. Old slugs merged via `RETIRED_CATEGORIES` (Photo Scouting→Photography, AI & Data + Transcription→Microtasks & AI, Product Testing→Paid Research) | Founder spec §12, applied to local + Neon main + preview |
| 2026-11-26 | Four discovery pathways are cross-category filters defined in `taxonomy.ts`, not categories | Update §4 |
| 2026-11-26 | Compensation/attribute model built as a typed display model first; DB columns deferred until the visual structure is approved | Update §18 ("no unnecessary backend complexity"); planned columns in DATABASE.md |
| 2026-11-26 | Saved missions stored on the device (localStorage) | User accounts not yet approved; saving still useful without sign-in |
| 2026-11-26 | Nearby uses a user-chosen country/region/city, never GPS; providers operating in an area are shown instead of invented local assignments | Update §8 |

## Open (founder)
- Add `docs/PROJECT_BLUEPRINT.md`
- Final logo
- Neon compute: project was created with min/max 1 CU; consider 0.25 CU min + scale-to-zero to cut cost
