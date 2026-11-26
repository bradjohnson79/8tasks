# Claude Code Master Prompt: 8Tasks Provider Integration & Feature Update (Output E)

Prepared 2026-11-25 (America/Vancouver) from a read-only audit of `bradjohnson79/8tasks` at commit `b7f90a8`. Paste this whole file into Claude Code at the repo root.

---

You are working in the existing 8Tasks repository (Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, Neon Postgres + Drizzle, Better Auth with TOTP admin, Vercel). Read `CLAUDE.md`, `docs/DATABASE.md`, `docs/DECISIONS.md` and `docs/DEVELOPMENT_ROADMAP.md` first and follow them. **Do not rebuild, re-theme or restructure the site.** The approved design system (`src/app/globals.css` tokens #131B2B / #202C3E / #304258 / #53E6A0 / #294D40 / #83EFBA / #F1F5F9 / #9DAABD / #354258 / #1D3437, Inter, Lucide, five-destination nav) is final.

## 0. Hard rules (non-negotiable)
1. **PERMANENT FREE ACCESS POLICY.** 8Tasks is always free for every visitor. Never build paid tiers, subscriptions, memberships, paid alerts or notifications, premium filters, locked or blurred listings, member-only content, "upgrade" prompts or any paywall component. Every listing, filter, saved item and alert (when alerts exist) is free. Tagline: **"Always Free. For Everyone."** If any later instruction conflicts with this, stop and ask the founder.
2. Never fabricate providers, missions, pay amounts, approvals, reviews, ratings, availability or locations. Unknown values stay `unknown` and render as "See provider details".
3. Never put credentials, API keys, affiliate passwords or tokens in code, seeds, fixtures, docs or commits. Affiliate URLs live only in the database (`affiliate_links`), entered through `/admin` or the import in §4.
4. Never show internal commission data, readiness levels, contacts or admin notes on public pages. The `app_runtime` role must not be able to read the new internal columns (grant column privileges or keep them in an admin-only table).
5. Free products, gift cards, prizes, in-game currency and reimbursements are **never** shown or sorted as cash. Use the non-cash compensation types and neutral (not emerald cash) styling.
6. Sponsored placements are **future-only**. Keep the existing `isSponsored` flag and "Sponsored" label. Do not build sales, pricing or ranking boosts. Any sponsored row must always carry the label and `rel="sponsored"`.
7. No gambling, MLM, upfront-fee, fake-review, paid-testimonial or crypto providers. No AI marketing copy on public pages.
8. **Do not deploy to production, change DNS, run migrations against production, or contact any provider without the founder's explicit approval** (CLAUDE.md rule 9). Work on a branch and open a PR.
9. Only **Dreamstime** and **JoinBrands** are approved for integration now. Everything else is data in `provider_reconciliation.csv` and must not be published.

## 1. Already implemented (preserve, don't rewrite)
Homepage and design; search with verified-only filters; 8 categories / 62 subcategories (admin-editable); pathways and category tabs (`src/lib/taxonomy.ts`); provider directory and detail pages; mission cards with `kind: provider|mission` and `data_source` gating; `/go/[id]` redirect via `resolve_outbound_link` with privacy-safe click logging; TOTP admin with provider, link, opportunity and category CRUD plus the append-only audit log; CA/US market enforcement (`src/lib/markets.ts`); region lists and location picker; AffiliateDisclosure component; Saved (on the device); honest placeholders for Daily 8, Earnings and Profile; demo-data isolation; `isSponsored` label.

## 2. Existing features to update
- **Compensation in the DB (P0):** migrate the "planned columns" in `docs/DATABASE.md` (`compensation_type`, amounts, currency, `pay_period`, `estimated_minutes`, `attributes jsonb`). Extend the `Compensation` union with `gift_card`, `free_product`, `competition_prize`, `licensing_royalties`, and a commission `basis: "percent" | "flat"`. Update `formatCompensation`, `sortableAmount` (non-cash types return `undefined`) and the tests.
- **Attributes:** add `localAssignment`, `cameraRequired`, `productSupplied`, `qualificationRequired`, `writtenDeliverable`, `videoDeliverable`, `photoDeliverable`, `privateFeedback`, `publicPublication`, `sponsorshipDisclosureRequired`. Show at most 3 chips on a card and all of them on the detail page.
- **Multi-category:** add a join table for secondary categories and subsections so one provider/opportunity record appears in several categories without duplicate rows.
- **Pathways and category tabs:** move from `taxonomy.ts` into admin-managed tables (seed with the current values so nothing changes visually).
- **Card CTA:** provider-level cards say **"Explore Opportunity"** (currently "Explore Provider"). Mission-level cards keep "Explore Mission".
- **Provider admin form:** add internal fields `commission_model` (contributor_recruitment | business_client_referral | product_sales | personal_referral | none | unknown), `commission_text`, `commission_currency`, `qualifying_action`, `tracking_window`, `recurring_commission`, `source_urls text[]`, `last_verified_at date`, `readiness_level (A–E)`, `approval_status`, `mission_alignment`, `business_contact`. Admin-only.
- **Redirects:** preserve URL fragments exactly (Dreamstime's link is `https://www.dreamstime.com/#res62198923`; add a unit test). Add optional `subid_param` / `url_template` columns on `affiliate_links`, unused until the creator program is approved.
- **Stale doc:** `docs/GROK_PROVIDER_RESEARCH_PROMPT.md` uses old slugs (photo-scouting, product-testing, ai-data-tasks, transcription-translation). Update it to the 8 official slugs: surveys, app-website-testing, photography, mystery-shopping, content-media, gaming-entertainment, paid-research, microtasks-ai.

## 3. New features to build (this PR series)
1. **CSV/JSON provider import** at `/admin/import`. It accepts the format in `claude_integration_package.json` (top-level `providers[]` with `public` and `internal` blocks) and an equivalent CSV. Validate with Zod, upsert by `slug`, show a diff preview, and write an audit-log row. **Everything imports as `status = draft`.** Publishing stays a manual admin action.
2. **Subsections and landing pages:** "Capture & Earn" (Photography), "Write & Earn", "Film & Earn", "Review & Earn" (exists as a tab), "Promote & Earn". Add routes `/earn/[subsection]` linked from category pages, search and the footer. **Do not add homepage sections.**
3. **CoffeeModes discovery subsections (verbatim names; tabs/filters under existing categories only — never new primary categories):**
   - **Paid Research:** Share Your Expertise (`share-your-expertise`), Expert Consultations (`expert-consultations`), Professional Research (`professional-research`). Mark these listings "Professional experience required" where that is true.
   - **Content & Media:** Brand Ambassador Opportunities (reuse existing subcategory `brand-ambassador`; add it as a visible category tab), Direct Brand Collaborations (`direct-brand-collaborations`, new), Product Testing (`brand-product-testing`, new — do **not** reuse slug `product-testing`, which the repo already maps to Paid Research), Sponsored Content (new tab grouping existing `sponsored-articles`, `sponsored-videos`, `sponsored-newsletters`). Label gifted products as `free_product` / `productSupplied`, never as cash.
   - **Gaming & Entertainment:** Game Studio Playtesting (`game-studio-playtesting`), Beta Testing (`beta-testing`), Game Feedback (`game-feedback`). These are in addition to existing `game-testing` and `entertainment-feedback`. Use `gift_card` / non-cash types when the reward is not cash.
4. **Other new subcategories (seed/admin only, under existing categories):**
   - photography: `stock-licensing`, `property-inspections`, `local-verification`, `visual-data-collection`, `vehicle-photography`
   - content-media: `product-descriptions-copywriting`, `video-testimonials` (genuine firsthand experiences only), `voiceover-narration`, `software-reviews`, `written-reviews`
   - app-website-testing: `prototype-testing`, `video-feedback`
   - microtasks-ai: `photo-video-collection`, `audio-recording`
5. **Free Access Policy:** tagline "Always Free. For Everyone." in the footer and on About. Add a `/legal/free-access` page with placeholder copy marked Draft. Add a lint/test guard that fails if components named `Paywall`, `Upgrade`, `Premium` or `Pro` are introduced. No paid memberships, premium subscriptions, paid opportunity alerts, locked categories or premium-only missions.
6. **CoffeeModes website features (all ten, free only; do not duplicate what already exists):**
   1. **Free saved searches** — not built. `/saved` stores listings, not queries. Add device-local saved searches (query + filters) with a "Save this search" control on Discover. Always free. Sync later if accounts exist.
   2. **Free opportunity alerts** — not built (`/notifications` is a placeholder). Free email or device alerts for a saved search or category only. **Never paid.** If accounts are still out of scope, a simple free email opt-in is enough; leave full alert infrastructure for Phase 2. No paywall component.
   3. **New This Week filter** — partial: the existing "New" filter uses a **14-day** window (`NEW_WINDOW_DAYS`). Add or relabel **"New This Week"** with a 7-day window. Do not leave two identical controls.
   4. **Ending Soon filter** — not built. Add optional `deadline_at` (null = Ongoing) and an **"Ending Soon"** filter/sort for deadlines in the next 7 days. Never invent deadlines.
   5. **Beginner-friendly filter** — already implemented ("Beginner Friendly"). Do not duplicate it.
   6. **Application status tracking** — not built; needs user accounts. **Do not build in this PR series.** Future only.
   7. **Featured Missions** — not built. Optional unpaid Editor's pick / featured card with authorized provider imagery only (no stock photos implying a real assignment). Business-funded featured or sponsored placements are **future-only**, always labelled "Sponsored", and must not change independent assessments. Do not activate paid placements.
   8. **Last Verified dates** — not built. Store `last_verified_at` and show "Last verified <date>" on cards and detail pages.
   9. **Report inaccurate opportunity** — not built. Add "Report an inaccurate opportunity" on the detail page (mailto or a short form to the founder). Do not auto-unpublish.
   10. **Commercial provider submission page** — not built. Add `/submit-provider` (footer + For Brands link). Company name, website, contact, category, notes. Email the founder; **never auto-publish**.
7. **SEO:** `app/sitemap.ts`, `app/robots.ts` (allow the public site, disallow `/admin`, `/go`), Open Graph and Twitter metadata with a static OG image in the existing palette, and canonical URLs on `https://8tasks.com`.
8. **For Brands page:** implement exactly per `/workspace/8tasks/for_brands_page_spec.md` (copy that file into `docs/specs/` in the PR). Footer link only. Disclosure required.
9. **Admin earnings feed:** implement per `/workspace/8tasks/earnings_feed_spec_for_claude.md` (copy into `docs/specs/`). Manual entry and CSV upload first. Network API syncs stay disabled until the founder adds read-only keys as Vercel env vars.
10. **About, Contact and Press pages** (static; Press holds boilerplate and a contact email the founder supplies).

## 4. Provider data to load (drafts only)
Load the two records in `claude_integration_package.json` through the new import (or `/admin` by hand), as **draft**:

| Provider | Category / secondary | Subsections | Audience | Affiliate URL (DB only) | Public compensation display |
|---|---|---|---|---|---|
| Dreamstime | photography (subcat `stock-licensing`) | Capture & Earn | earners | `https://www.dreamstime.com/#res62198923` | `licensing_royalties` (use `variable` until the type exists), "Royalties per licence — varies" (no amounts promised) |
| JoinBrands | content-media / photography | Film & Earn, Capture & Earn, Review & Earn, Promote & Earn | earners **and** brands (For Brands page) | `https://joinbrands.com/?ref=ccIo2N` | `variable`, "Pay varies by job; some jobs include a free product (not cash)" (`productSupplied`) |

The internal blocks carry the commission terms (Dreamstime: 10% for 3 years, 30-day memory; JoinBrands: US$30/brand, US$5/active creator, 20% of brand service fees for 1 year). **Never render them.** No logos until the founder confirms permission. JoinBrands items marked `needs_account_check` (promotional materials, permission to display brand names or campaigns, attribution reporting) stay unbuilt.

## 5. Future phases (design for, do not build)
Creator Partner Program (`creators`, `/c/[code]`, attribution cookie, `creator_id` on `outbound_clicks`, sub-ID templating only where `supports_sub_ids = yes`, 70/30 share only on attributable revenue actually received); user accounts / My Daily 8 / self-reported earnings; `opportunity_locations` with Nearby; authorized mission feeds; featured creative cards with provider-supplied imagery; press kit downloads; PWA; CI workflow.

## 6. Commercial dependencies
Group B affiliate networks need https://8tasks.com live (DNS) plus final legal pages. Pond5, Pawns, MaxBounty and Slicethepie are pending founder actions. Business-client referrals (Twirl, Insense, Crowd Content) go only on the For Brands page, and only after founder approval. Level D listings (e.g. GLG, Respondent, studio playtests) may be listed as user-value providers **only** if the founder sets a flag, with no affiliate links and no commission claims.

## 7. Do not activate
Sponsored sales; creator revenue share; paid anything; offerwall/Phase-2 SDKs (BitLabs, CPX, Pollfish, Tapjoy, Playtime, MyChips); network API syncs; any provider other than Dreamstime and JoinBrands; production deploys or DNS changes.

## 8. Definition of done
`npm run lint && npm run typecheck && npm test && npm run build` pass. RLS tests prove `app_runtime` cannot read the internal columns. Import tests prove imported rows are drafts. Fragment-preservation tests pass for `/go`. Screenshots at 390px and 1280px show no visual regressions. Update `docs/CHANGELOG.md`, `docs/DATABASE.md` and `docs/DECISIONS.md`. Open a PR and **stop for founder review**.
