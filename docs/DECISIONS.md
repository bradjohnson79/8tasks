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
| 2026-11-26 | **Hero artwork restored as the one exception** to the spec's no-graphics rule: static (no float), design-system colours, wide screens (≥1024px) beside the headline; hidden on phones so search and Daily 8 stay near the top | Founder decision |
| 2026-11-26 | **Production go-live approved by founder**: `main` deployed to Vercel production, domains 8tasks.com (+ www → apex 308), Neon `main` with least-privilege runtime/admin login roles | Founder instruction; production shows real listings only (none yet) |

| 2026-11-26 | Earnings rollups computed at query time (no materialized `affiliate_period_stats` table yet) | Volume is tiny; avoids a refresh job. Revisit if the page gets slow |
| 2026-11-26 | Postback secret via query/header, not path; unknown programs get 202 and are logged, not stored | Networks retry on non-2xx; no guessing which program a conversion belongs to |
| 2026-11-26 | For Brands renders from `data/site_links.json` in the repo (rebuilt from the founder's link map) | No page code change needed for new live brand offers |
| 2026-11-26 | Founder admin `8tasks@proton.me` created directly in Neon with a random temporary password (TOTP enrolment forced, password change at `/admin/account`) | Founder request; container cannot reach Neon over TCP for the CLI |

| 2026-11-26 | Master prompt implemented on the dev branch + PR, not deployed to production; migrations only on local + Neon preview | Master prompt §0.8 / CLAUDE.md rule 9 |
| 2026-11-26 | Internal commission terms live in a separate admin-only table (`provider_internal`) rather than column grants | Simplest way to guarantee app_runtime can never read them |
| 2026-11-26 | Pathways, tabs and subsections share one `discovery_groups` table; code defaults are the fallback if the table is empty/unreachable | One admin screen, site never breaks on config |
| 2026-11-26 | Re-importing a provider moves it (and its imported opportunities) back to draft | Spec: "everything imports as draft"; the preview warns first |
| 2026-11-26 | Alerts: free opt-in stored with consent text; no emails sent until an email service is approved. Existing addresses can't be changed or re-subscribed by third parties | No accounts/email verification yet; CASL/CAN-SPAM consent record |
| 2026-11-26 | Saved searches are device-local (localStorage), like saved items | Accounts not approved |
| 2026-11-26 | Report / submission forms store rows for admin review (no email) | No email service yet; never auto-publish |
| 2026-11-26 | JoinBrands countries set to US only, Dreamstime CA + US, in the draft import | Not verified; founder to confirm before publishing |

| 2026-11-26 | Email-only subscriptions with double opt-in (no account) and token links; consent wording versioned | Spec §4; CASL/CAN-SPAM |
| 2026-11-26 | Daily 8 only includes providers with `allows_email_traffic = yes` (default unknown) | Rule 6 + spec §6 |
| 2026-11-26 | Email buttons go to 8Tasks pages (`/e/…` click log), never straight to affiliate URLs | Keeps /go as the only affiliate redirect; no prohibited params; creator attribution untouched |
| 2026-11-26 | Click tracking and open tracking in Resend left off; our own redirect counts clicks | Privacy, accuracy |
| 2026-11-26 | Three gates before automated mail: env `EMAIL_SENDING_ENABLED`, admin pause (default on), postal address | Spec: no production sending before founder approval |
| 2026-11-26 | Added 8tasks.com to the (shared) Resend account; API key + webhook left for the founder | Secrets never pass through chat |

| 2026-11-26 | Public repo: commission notes and deal terms are not committed (link map + package copies are stripped); full files are imported through the admin | Repo is public |
| 2026-11-26 | Link-map "sample" rows are not published: they have no country data (CA/US rule) and old category names, and the master prompt approves only Dreamstime + JoinBrands | Never guess eligibility |
| 2026-11-26 | Publishing requires readiness A (D only as founder-flagged user-value listing, no affiliate links) | Gap analysis G-30 |

## Open (founder)
- Add `docs/PROJECT_BLUEPRINT.md`
- Final logo
- Neon compute: project was created with min/max 1 CU; consider 0.25 CU min + scale-to-zero to cut cost

## 2026-11-26/27: Founder decisions on listings and accounts
- Optional free accounts ship (Phases 1–2); Google sign-in stays off until credentials exist.
- Non-affiliate providers are listed as "Independent listing" (Level D internally); they never show pay unless verified.
- Single-country (CA-only or US-only) providers are allowed; country restrictions must be shown and Daily 8 excludes
  ineligible countries. None imported yet: they need records and verification first.
- JoinBrands approved for Capture, Film, Review and Promote & Earn (no incentivized/positive-only reviews, no brand
  campaigns without permission). OnlineBookClub and Groover: list only after their conditions are verified.

