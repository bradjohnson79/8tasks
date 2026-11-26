<!-- Copied from the founder's message in the build session, 2026-11-26. -->
# 8Tasks admin affiliate earnings feed — build spec for Claude Code
Audience: Claude Code (site build).
Owner: Brad Johnson, ANOINT Inc.
Related files: /workspace/8tasks/earnings_feed_sources.csv (per-program research), /workspace/8tasks/signup_plan.csv, /workspace/8tasks/site_links.csv.
Research date: 25 November 2026 (America/Vancouver). API details are from official docs only; anything not confirmed is marked unverified.

8Tasks is pre-launch. The public directory is for earners. This feed is admin-only: it shows Brad, per agency/program, what 8Tasks is earning as the affiliate (clicks, signups/conversions, commissions pending/approved/paid, payout method, last payout).

Live programs today:

Dreamstime — https://www.dreamstime.com/#res62198923
JoinBrands — https://joinbrands.com/?ref=ccIo2N (PayPal already connected)
Do not invent traffic, rates, or approvals. Do not put API keys, passwords, or payout credentials in the repo, in client bundles, or in chat. Brad sets secrets in server environment variables.

1. Goal
An admin page where Brad can answer, at a glance:

Which agencies are actually earning?
How much is pending, approved, and paid, in each currency?
When was the last payout, and by what method?
When was each source last synced?
Plus a tight ingestion layer: scheduled API syncs for networks that have official APIs, a postback endpoint for networks that push conversions, and manual / CSV import for dashboard-only programs.

2. Unified data model
Use two layers: normalized transactions (source of truth) and period summaries (what the admin table reads). Do not store only summaries — reversals and late approvals are common.

2.1 affiliate_programs (registry)
One row per program 8Tasks promotes or is applying to. Seed from earnings_feed_sources.csv + site_links.csv (provider_id).

Field	Type	Notes
id	slug / PK	Use existing provider_id where possible (dreamstime, joinbrands, pawns-app, panelplace, …). Networks themselves also get a row (impact, awin, cj, flexoffers, daisycon, maxbounty, offerjuice).
name	text	Display name
network	text / enum	direct, impact, awin, cj, flexoffers, daisycon, maxbounty, offerjuice, or a primary network if several exist
network_campaign_id	text, nullable	e.g. Awin advertiser / CID 87963 for PanelPlace; Impact CampaignId once known
payout_method	text, nullable	e.g. PayPal for JoinBrands; fill from official docs or Brad; do not guess
currency_default	char(3), nullable	ISO 4217
affiliate_url	text, nullable	Live tracked link when we have one
data_method	text	See sources CSV
status	enum	live, pending_signup, waiting_for_site, paused, not_in_scope
notes	text, nullable	Admin-only
A program may be reachable through more than one network. Store the live path actually used on 8tasks.com as network. If a second path is later approved, add a second program row or a affiliate_program_sources join — never double-count the same conversion (see §8).

2.2 affiliate_transactions (source of truth)
One row per conversion / commission event / payout line, upserted on (source, external_id).

Field	Type	Notes
id	UUID / PK	
program_id	FK	
network	text	Denormalized for queries
external_id	text	Network action/transaction/commission/invoice/payment id
type	enum	conversion, adjustment, payout
status	enum	pending, approved, paid, reversed / declined / disapproved
event_at	timestamptz	Click or conversion time from the network
posted_at	timestamptz, nullable	When the network recorded it
paid_at	timestamptz, nullable	
clicks	integer, nullable	Only on aggregates; leave null on per-conversion rows
sale_amount	numeric, nullable	
commission_amount	numeric	Signed. Corrections / reversals are negative or a new adjustment row — follow the source (CJ official docs: combine original + correction delta records that share an orderId)
currency	char(3)	Never convert in MVP; total by currency
sub_id	text, nullable	Our click id / SubID
click_id	text, nullable	Network click id if different
payout_method	text, nullable	Copied onto payout rows when the source provides it
payout_external_id	text, nullable	Payment/invoice id when a conversion is marked paid
raw	jsonb, nullable	Original payload for debugging; strip secrets
source	enum	impact_api, awin_api, cj_api, flexoffers_api, daisycon_api, postback, csv_import, manual
synced_at	timestamptz	
Map network statuses onto the four feed statuses:

Feed status	Impact	Awin	CJ	FlexOffers	Daisycon	JoinBrands (manual)
pending	PENDING	pending	action not yet locked (use official actionStatus)	pending	open	commission not yet in wallet (60-day wait)
approved	APPROVED	approved (paidToPublisher=false)	locked / payable (confirm field in schema)	approved	approved but not yet paid	in wallet, not yet withdrawn
paid	invoice/line PAID or PaidDate set	paidToPublisher=true	unverified in Commission Detail; may need dashboard/manual until a payments field is confirmed	appears in /payments/*	approved and payable/paid (confirm field in Swagger)	Wallet withdrawal completed
reversed	REVERSED	declined / deleted	correction / cancelled order	canceled	disapproved	refund/clawback Brad records
2.3 affiliate_period_stats (materialized or computed)
The admin table is a rollup, default period = current calendar month in America/Vancouver, with a period picker (month, last 30 days, custom).

Field	Type
program_id	FK
network	text
period_start / period_end	date
clicks	integer, nullable (null = unknown, not zero)
conversions	integer
commission_pending	numeric
commission_approved	numeric
commission_paid	numeric
currency	char(3)
payout_method	text, nullable (latest known for the program)
last_payout_date	date, nullable (latest paid_at of type payout, or latest paid conversion if that is all we have)
source	text (comma-joined if mixed, e.g. impact_api,postback)
last_synced	timestamptz
clicks are often only available from network aggregate reports (Impact /Clicks or /Reports, Awin advertiser report). If a source cannot provide clicks, show an em dash, not 0.

3. Connector adapters (scheduled sync)
Put connectors under something like lib/affiliates/connectors/. Each adapter implements:


interface EarningsConnector {
  id: 'impact' | 'awin' | 'cj' | 'flexoffers' | 'daisycon';
  syncTransactions(from: Date, to: Date): Promise<SyncResult>;
  syncPayouts?(from: Date, to: Date): Promise<SyncResult>;
  syncClicks?(from: Date, to: Date): Promise<SyncResult>;
}
Chunk date windows to each API's official max (Impact Actions 45 days; Awin transactions 31 days; CJ commissions 31 days). Honour Retry-After / 429. Log request counts; do not log tokens.

Credentials live only in server env vars, set by Brad. Suggested names (never commit values):

Network	Env vars	Official auth	Official docs
Impact	IMPACT_SID, IMPACT_TOKEN	HTTP Basic, AccountSID:AuthToken. Read-only Partner token. Base https://api.impact.com/Mediapartners/{SID}	https://integrations.impact.com/partner-api-reference/readme/authentication
Awin	AWIN_API_TOKEN, AWIN_PUBLISHER_ID	Authorization: Bearer <PAT or classic token>	https://help.awin.com/apidocs/api-authentication
CJ	CJ_API_TOKEN, CJ_PUBLISHER_ID	Authorization: Bearer <personal access token>	https://lab-developers.d.cjpowered.com/authentication/overview
FlexOffers	FLEXOFFERS_API_KEY (and DomainID if needed)	Publisher API key; support docs use an apiKey header (confirm in https://api.flexoffers.com Swagger)	https://www.flexoffers.com/publishers/web-service-api/
Daisycon	DAISYCON_CLIENT_ID, DAISYCON_CLIENT_SECRET, refresh token storage	OAuth 2.1 + PKCE; access token 30 min; refresh token 30 days, single use — persist the new refresh token after every refresh	https://faq-publisher.daisycon.com/hc/en-us/articles/24835908705809-API-Authentication-with-OAuth
3.1 Official endpoints to use (do not invent others)
Impact (covers Freecash, Pawns/IPRoyal, Swagbucks, Ipsos iSay, Survey Junkie, and other approved campaigns in one account):

GET /Mediapartners/{SID}/Actions?StartDate=&EndDate=&State= — conversions and commission (Payout, State, Currency, CampaignId). Max 45-day window.
GET /Mediapartners/{SID}/Invoices?StartDate=&EndDate= — payout amounts, line-item Status / PaidDate / CampaignName.
Optional later: /Reports/{Id}, /Clicks, /ClickExport (10/day), Event Notifications.
Rate limits: Actions/Clicks/listing reports 500/hour; other reports 250/hour; general 1000/hour; ReportExport 100/day; ClickExport 10/day.
https://integrations.impact.com/partner-api-reference/readme/rate-limits

Awin (covers PanelPlace CID 87963 and other approved programmes):

GET https://api.awin.com/publishers/{publisherId}/transactions/?startDate=&endDate=&timezone=UTC — max 31 days; filter status, advertiserId. Use paidToPublisher + paymentId for paid.
GET https://api.awin.com/publishers/{publisherId}/reports/advertiser?startDate=&endDate=&region= — clicks, pending/confirmed/declined commissions. region is required (CA, US, etc.).
Throttle: 20 calls per minute per user.
https://success.awin.com/s/article/Publisher-API-GET-transactions-list
https://help.awin.com/apidocs/get-advertiser-performance-report

No official Publisher payments/invoices API was found. Derive last payout from transaction payment fields and/or a CSV from the Payment Report UI.

CJ:

POST https://commissions.api.cj.com/query — GraphQL publisherCommissions. Paginate with payloadComplete / sinceCommissionId / maxCommissionId. Caps: 31-day range, 10,000 rows/page, 200 calls / 5 minutes.
https://lab-developers.d.cjpowered.com/graphql/reference/Commission%20Detail
A publisher payments API was not found in official docs (unverified). commission_paid / last_payout_date may need manual/CSV until confirmed.

FlexOffers (covers YourSurveys and other approved advertisers):

GET https://api.flexoffers.com/allsales?reportType=details&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status= — official 2021 update: call once per status (pending, approved, canceled, bonus, non-commissionable), not all statuses at once.
GET /payments/summary → paymentId, paymentDate, paymentMethod, referenceCode, amount
GET /payments/details?paymentId=
Pagination and max date window for /allsales are unverified on public marketing pages — confirm in Swagger before coding tight loops.
https://www.flexoffers.com/new-features/sales-api-and-transaction-reporting-updates/
https://www.flexoffers.com/new-features/performance-report-enhancement-and-payments-api/

Daisycon:

Live https://services.daisycon.com — official example: GET /publisher/{publisher_id}/transactions?start=&end=&page=&per_page= (singular /publisher/; confirm in Swagger).
Optional: scheduled URL export https://export.daisycon.com/publishers/{publisher_id}/transactions/{csv|json|xml|xlsx}?token=&username=
Statuses: open → pending, approved → approved, disapproved → reversed. Only approved transactions are payable.
Rate limit: 50 req/min/IP production (429 then 1-minute IP block); sandbox 15/min.
Payment-resource paths: unverified until read from official Swagger after the account exists. Official FAQ also mentions webhooks for new orders and payments.
https://faq-publisher.daisycon.com/hc/en-us/articles/31466185933201-Daisycon-API-Sandbox-and-Example-Code
https://faq-publisher.daisycon.com/hc/en-us/articles/24871491303313-Daisycon-API-Rate-limits

MaxBounty and OfferJuice: no official public reporting API was found. Do not build a username/password scraper. Use postbacks (MaxBounty) and manual/CSV (both). See §4 and the sources CSV.

Schedule: a daily server cron (e.g. 06:00 America/Vancouver) is enough for MVP. Pull a short overlap (e.g. last 7 days plus the current month) so late approvals and reversals catch up. After a 429, back off; never tight-loop.

Connectors for Impact / Awin / CJ / FlexOffers / Daisycon should be written so they no-op with a clear "credentials not configured" state until Brad adds env vars. Do not block the site build on network accounts that are still Group B.

4. Postback endpoint and outbound SubID / click-id
4.1 Inbound postbacks
Expose server routes only, HTTPS, no index, no auth-cookie session. Authenticate with a path secret or shared query/header token stored in env (AFFILIATE_POSTBACK_SECRET). Return 2xx quickly; process idempotently on (network, external_id or click_id+payout+time).

Suggested routes:

POST/GET /api/affiliates/postbacks/maxbounty
POST/GET /api/affiliates/postbacks/flexoffers
POST/GET /api/affiliates/postbacks/impact (Impact Event Notifications can be GET query-string or POST JSON)
POST/GET /api/affiliates/postbacks/generic (fallback)
MaxBounty (primary postback target): official public docs reviewed do not list tokens. Integration practice (confirm in the approved dashboard before going live): put our click id on the offer URL as s2={clickId}; set a global or per-offer callback to our URL with at least #S2# and #RATE#. Treat other tokens (#S1#, #S3#, #OFFID#, #CONVERSION_ID#) as unverified until seen in-account.

FlexOffers: official reporting-tools page confirms optional real-time postbacks. Support docs: Flex Apps → Postback URLs; pass fobs= on the link; macros #fobs#, #on#, #sa#, #ca#, #clickid#, #flx_salesid#, #et#, #pgid#.
https://www.flexoffers.com/publishers/reporting-tools/
https://supportbeta.flexoffers.com/knowledge/do-you-support-global-postback-urls

Impact: configure Event Notifications in the partner account to our HTTPS URL; respond 2xx. Fields commonly include campaign_id, action_id, status, payout.
https://integrations.impact.com/partner-api-reference/partner-v15/reference/webhooks/event-notifications

Postbacks update affiliate_transactions immediately but scheduled API sync remains the reconciliation source where an API exists. Deduplicate rather than add.

4.2 Outbound links
Every public 8Tasks listing link should go through a thin click wrapper (or a documented parameter appended to the network URL) that records a click id and passes it as the network SubID:

Network	Official parameter
Impact	subId1 (also subId2, subId3; 255 alphanumeric chars). https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/tracking/tracking-links/link-parameters/sub-id-and-shared-id-parameters-explained-for-partners
Awin	clickRef (and typically clickRef2–6 — confirm in-account; official click-reference article exists)
FlexOffers	fobs, fobs2–fobs5
MaxBounty	s2 (and s1 / s3 if used)
CJ	Confirm in-account (unverified here; often sid)
Daisycon	Confirm in-account (unverified here)
Direct (Dreamstime, JoinBrands, Pond5, …)	Usually no SubID. Wrapper can still log the click locally. Do not invent parameters that break the live ref link.
Do not put PII in SubIDs. Do not change already-live Dreamstime (#res62198923) or JoinBrands (?ref=ccIo2N) formats other than appending a documented extra param if the program supports one (JoinBrands / Dreamstime SubID support is unverified — default to local click logging only).

5. Manual entry and CSV import
Required in MVP. This is the only path for the two live programs today, and the fallback for every dashboard-only source (Pond5, Slicethepie, User Interviews, OfferJuice until documented, Branded Surveys direct, Pawns direct dashboard).

Admin form: pick program, period or individual transaction, status, amounts, currency, payout method, last payout date, optional note.
CSV import with a stable template, e.g.
program_id,network,event_date,status,clicks,conversions,commission_amount,currency,payout_method,payout_date,external_id,notes
Pond5 officially offers a CSV of individual referral transactions from Dashboard → Financials — that should map onto the template (document the column mapping once Brad can export a sample; do not guess columns).
User Interviews: monthly emailed report → CSV or manual rows; when Brad is paid on the invoice, mark those rows paid and set last_payout_date.
Idempotent upsert on (program_id, external_id) when external_id is present; otherwise treat as a new manual row.
Keep an audit log (who imported, when, filename). Only admin users can import.
6. Admin-only page
Auth: server-side protected. Not linked from the public nav. Not in sitemaps. Role = Brad / site admin only. Same auth model as any other 8Tasks admin, or a dedicated admin gate if that does not exist yet.

URL (suggestion): /admin/earnings (exact path is up to the app router).

Views:

Per-agency table — one row per program (and currency if a program earns in more than one). Columns: program, network, period, clicks, conversions, commission pending, approved, paid, currency, payout method, last payout date, source, last synced.
Totals by currency — sum pending / approved / paid for the selected period. Never mix CAD and USD into one number.
"Which agencies are earning" — default filter: programs with conversions > 0 or any commission ≠ 0 in the period. A second chip/tab lists configured programs with no earnings yet (so Brad can see coverage, not just winners).
Period picker; last-synced timestamp in the header ("Impact 06:02 PT; JoinBrands manual 25 Nov").
Drill-down later (not MVP): transaction list for one program.
JoinBrands payout method should show PayPal once seeded. Pond5 payouts, once the account exists, are officially USD on the 15th when the USD 25 minimum is met.

This page is not the public "For Brands" footer page. It is internal.

7. Security
API keys, OAuth client secrets, refresh tokens, and postback secrets: server env vars only, set by Brad. Never in source, .env.example may list names only, never in client JS, never in chat, never in CSV backups committed to the repo.
Request read-only scopes wherever the network allows (Impact: start with a read-only token). Do not call withdrawal-update or payment-request endpoints in MVP (Impact PUT /WithdrawalSettings and any Daisycon payment-request tools are out of scope).
Admin routes require authenticated admin. Postback routes use a secret, not the admin session.
Rate-limit postback URLs. Reject missing/invalid secrets with 401/403 and no extra detail.
Do not log Authorization headers, tokens, or raw request URLs that contain secrets.
raw JSON on transactions must be scrubbed of credentials.
SubIDs must not contain emails, names, or other PII.
8. Deduping and "one live path"
Several programs are listed on more than one network (Swagbucks, Survey Junkie, Branded Surveys, Valued Opinions, Pawns direct vs Impact). Rules:

Each public 8Tasks link uses exactly one tracking URL / network.
The feed attributes earnings to that network.
If Brad later also has a direct IO (e.g. Branded Surveys) plus a MaxBounty listing, show two rows only if both accounts can actually pay — and warn in the UI that the same user must not be counted twice. Prefer one coordinated path (see signup plan: MaxBounty first for Branded Surveys if that account is already approved).
Pawns.app: direct partner dashboard is one source; IPRoyal-on-Impact is another. When the Impact application is approved, prefer the Impact connector for automated numbers and keep the direct dashboard as a check, or map a single program row to the Impact campaign to avoid double counting.

9. MVP vs later
MVP (build now, even before most network accounts exist)
Schema for programs, transactions, and period rollups.
Seed program registry from the sources CSV / site_links (dreamstime and joinbrands as live; others pending_signup or waiting_for_site).
Admin-only /admin/earnings page: per-agency table, totals by currency, "earning" vs "configured but quiet" views, period picker, last synced.
Manual entry + CSV import (this is how Dreamstime and JoinBrands get into the feed on day one). Pond5 CSV mapping ready to fill in when Brad can export.
Generic postback endpoint + secret, with a MaxBounty parser stub (tokens confirmed after that account is approved).
Outbound click wrapper that logs clicks and appends SubIDs only when the link is a network URL with a documented parameter. Leave current Dreamstime and JoinBrands URLs intact.
Env-var contract and a disabled/no-op Impact connector skeleton (highest-leverage first API, but the Impact account is Group B and not live yet).
Security as in §7.
Later (after the relevant account exists, or as a follow-on PR)
Live Impact connector: Actions + Invoices, then Event Notifications and click reports.
Awin, FlexOffers, CJ, Daisycon connectors (in that order is fine: Awin unlocks PanelPlace; FlexOffers unlocks YourSurveys; CJ and Daisycon as those accounts are approved).
FlexOffers and Impact postbacks wired in production.
MaxBounty dashboard CSV reconciliation once Brad is in the account.
OfferJuice / User Interviews / Branded Surveys direct: add an importer once they document a report format (do not email them without Brad).
Pawns direct dashboard: manual/CSV unless they later publish an API; Impact path when approved.
Transaction drill-down, scheduled email-report ingestion, FX conversion, PayPal settlement matching, alerts when a sync fails or a program stops reporting.
FOUNDER REVIEW offerwalls and mystery-shopping programs: out of scope until Brad qualifies them. Offerwall publisher APIs are a different model (Phase 2 / paying users), not this affiliate-commission feed.
Do not scrape dashboards. Do not build unofficial MaxBounty login APIs. If official docs are missing, use manual/CSV and mark the method unverified in the sources CSV.

10. Implementation notes for Claude Code
Keep this feed off the public site build's critical path. A missing network credential must not break deploys.
When an affiliate link is added to site_links (via the 8Tasks Assistant Bot), upsert the program row and leave earnings at unknown until a sync or manual import.
Timezone for period boundaries and "last synced" display: America/Vancouver. Store instants in UTC.
Currencies seen or expected: USD (most networks, Pond5, JoinBrands), CAD possible on Awin/Payoneer. Always group totals by currency.
Copy on the admin page should say "8Tasks affiliate earnings" so it is never confused with end-user wallet balances.
Update /workspace/8tasks/earnings_feed_sources.csv if a live account reveals an official API that this research marked unverified — do not silently invent endpoints in code.
