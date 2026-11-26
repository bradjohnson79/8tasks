# Feature reconciliation: Competitive Enhancement & UX Expansion directive

Date: 2026-11-26. Required by directive §37 before major changes. Nothing in this report has been built yet.
Competitor sites were **not** copied; only capability ideas are referenced.

## 1. Already in place
| Directive item | Where |
| --- | --- |
| Design system: navy/emerald tokens, Inter, Lucide, bottom nav, mobile-first | `docs/DESIGN_SYSTEM.md`, `src/components/app/*` |
| 8 primary categories (admin-configurable, subcategories) | `scripts/seed-data.ts`, `/admin/categories` |
| 4 pathways (Quick Earnings, Local Missions, Create & Earn, Recurring Income) as cross-category filters | `src/lib/taxonomy.ts` |
| Search + filters that only use verified data | `src/lib/missions/filters.ts`, `/missions` |
| Compensation display model: fixed, range, hourly, variable, reimbursement-only, payment+reimbursement, commission (recurring), hybrid, non-cash, unknown | `src/lib/missions/types.ts` (display only, not in DB) |
| Attribute flags: remote, in-person, smartphone, purchase required, beginner-friendly, etc. | same file (display only) |
| Provider profiles, CA/US market filter, `/go/[id]` redirect + click log + SubIDs | `/providers/[slug]`, `src/lib/markets.ts` |
| Affiliate disclosures, sponsored labels, legal pages (draft copy) | `AffiliateDisclosure`, `/legal/*` |
| Saved missions (on-device) | `/saved` |
| Admin: providers, links, opportunities, categories, audit log, earnings feed, account, MFA | `/admin/*` |
| For Brands page | `/for-brands` |

## 2. Partially in place
| Item | Gap |
| --- | --- |
| My Daily 8 | Page and explainer exist; no recommendation logic yet (and none to recommend: zero real listings) |
| Earnings tracker (user) | Placeholder page only. Needs accounts or local storage |
| Creative subsections | Content & Media has Review & Earn, Blogging, Vlogging, UGC, Affiliate tabs. Missing: Capture & Earn, Write & Earn, Film & Earn, **Transcribe & Earn**, Promote & Earn, Share Your Expertise as named cross-cuts |
| Geographic discovery | Country/region/city picker (no GPS). No postal/ZIP lookup |
| Homepage hierarchy | Header, search, Daily 8, pathways, categories exist. Missing: Spotlight, Newly Added, featured providers, Creator Partner invite, "Always Free. For Everyone." |
| Compensation types | Missing per-word/article/photo/video/audio-minute/audio-hour/message, royalties, gift cards, prizes. The model needs audio-duration vs working-time wording |
| Provider verification fields | Only capabilities + countries. Missing payout methods, minimum, frequency, requirements, equipment, upfront costs, source references, last-verified date, availability status |

## 3. Missing
Availability statuses + automatic expiry; freshness/link checks + review queue; Report-an-opportunity + admin queue;
`/trust`; `/safety-check`; methodology page; `/tools` calculators; RSS; saved searches; alerts + email digest;
editorial collections/Spotlight; geographic SEO pages; Creator Partner Program, `/partners/promote` asset library,
partner dashboard; offline video pipeline (Remotion/FFmpeg); JSON/CSV provider import as drafts; app-rating fields.

## 4. Proposed plan (in priority order)
**Phase 1 (low cost, high value; no new services)**
1. Migration 0004: provider verification fields (all nullable = "unverified"), `provider_sources` (url, kind: official / affiliate / third-party, checked_at), `availability_status` enums on providers + opportunities, `closes_at` on opportunities, compensation columns (type, amounts, currency, unit incl. audio-minute/hour), attribute booleans, `opportunity_tags` for creative subsections, `listing_reports` table.
2. Admin forms for these fields; provider CSV/JSON import that always lands as `draft`.
3. Auto-expiry: query-time (`closes_at < now()` → closed, never listed as open) plus a daily cron that flips status and keeps the archived page with alternatives.
4. Creative subsections (Capture/Write/Film/Review/Transcribe/Promote/Expertise) as config in `taxonomy.ts` mapped to subcategories/tags. No new primary categories.
5. Report-an-opportunity form (rate-limited, honeypot, no public display) → `/admin/reports` queue.
6. Free-access messaging + tagline updates; `/trust`, methodology and `/safety-check` (static/client-only, collects nothing).
7. Link-check cron (HEAD/GET of official + affiliate URLs, weekly); 3 consecutive failures → review queue, never auto-delist.

**Phase 2**: Spotlight + editorial collections (admin), Newly Added / Recently Verified (from real timestamps), rules-based Daily 8 (guest = curated; prefs in localStorage), saved searches (localStorage), RSS `/opportunities/rss.xml`, `/tools` calculators, postal/ZIP → province/state lookup (static prefix table, no paid API).

**Phase 3 (commercial dependencies)**: Creator Partner Program, asset library, referral links, partner dashboard, offline Remotion videos.

**Deferred**: accounts, email alerts/digest (needs Resend + consent flow + accounts), geographic SEO pages (until real coverage exists), personalized rendering, QR codes.

## 5. Commercial dependencies and conflicts (founder decisions needed)
- **CLAUDE.md scope conflict**: user accounts, My Daily 8 personalization, creator program are currently "out of scope until approved". This directive implies approval; please confirm, and I'll update CLAUDE.md.
- **Creator 70/30 revenue share** needs (a) upstream programs that allow sub-affiliate revenue share (currently all `unknown`), (b) a payout process; 8Tasks would then pay partners, which is a financial workflow (rule 9) plus tax forms (W-9/W-8BEN, T4A). Recommend: build the public page + application form only; no ledger or payouts yet.
- **Video assets**: Remotion requires a paid company license for businesses with more than 3 employees (free for a solo founder; confirm). Hosting MP4s needs file storage (Vercel Blob about US$0.023/GB-month + transfer). Licensed music has a separate cost.
- **Email alerts/digest**: Resend free tier is 3,000 emails/month, then US$20/month. Needs consent + unsubscribe + accounts or double opt-in.
- **App ratings**: app-store terms; manual entry only, with source and date.
- Prospect list (micro1 … Pila8): stored nowhere until Grok/Brad approve; no listings activated.

## 6. Estimated operating costs (incremental)
Phase 1–2: about $0 (existing Vercel Pro + Neon; one more daily cron). Main existing cost: Neon compute 1 CU always on.
Recommend 0.25 CU minimum + autoscale. Phase 3: storage for videos (a few dollars/month at low volume), optional Resend $20/month.

## 7. Risks
Thin content (no real listings yet: most new surfaces will show empty states until providers are approved); scope creep
for a solo founder; partner payouts creating money-transmission/tax obligations; stale verification dates (must show real dates);
spam in reports (mitigated by rate limit + no public display).
