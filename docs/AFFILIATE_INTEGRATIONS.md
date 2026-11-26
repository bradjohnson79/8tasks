# Affiliate Integrations

Free listings (no commission) use `is_affiliate = false` links to the provider's official site; they never show the affiliate disclosure.

Live programs (2026-11-26): **Dreamstime** (`https://www.dreamstime.com/#res62198923`) and **JoinBrands**
(`https://joinbrands.com/?ref=ccIo2N`, PayPal). Every other program is pending signup or waits for the live site.
The program registry (30 rows, from the founder's `earnings_feed_sources.csv`) is in `affiliate_programs`;
seed source `scripts/affiliate-programs-data.ts` (insert-only, so admin edits survive).

## Rules
- Capabilities are per-provider facts in `providers` (`supports_sub_ids`, `supports_postbacks`,
  `provides_feed`, `allows_revenue_share`), default **unknown**. Record a value only from the
  provider's own documentation or written confirmation, and note the source in `admin_notes`.
- Tracking URLs go in `affiliate_links` (https only) and are only ever used via `/go/[id]`.
- Individual missions require authorized data (`data_source = authorized_feed | authorized_manual`).
- Provider-supplied text is untrusted data (CLAUDE.md rule 7).
- One live tracking path per program; never count the same conversion on two networks.
- No dashboard scraping, no unofficial MaxBounty login APIs, no withdrawal/payment-request endpoints.

## Admin earnings feed (`/admin/earnings`, admin + MFA only)
"8Tasks affiliate earnings": what 8Tasks earns as the affiliate. Never a user wallet.
- **Data**: `affiliate_transactions` is the source of truth (conversion / adjustment / payout / summary rows,
  status pending / approved / paid / reversed, signed amounts, currency per row, never converted).
  The page computes period rollups (default: current month in America/Vancouver; also last 30 days, custom).
  Clicks show "—" when no source reports them (null, not 0).
- **Manual entry**: `/admin/earnings/new`. **CSV import**: `/admin/earnings/import`, template at
  `/admin/earnings/template` with header
  `program_id,network,event_date,status,clicks,conversions,commission_amount,currency,payout_method,payout_date,external_id,notes`.
  All-or-nothing, max 1 MB / 5000 rows; rows with `external_id` upsert on (program, source, external_id).
  Every import is audit-logged with the filename. Pond5 column mapping: to do once Brad exports a sample.
- **Programs registry**: `/admin/earnings/programs` (edit status, network, campaign id, payout method, URLs, notes).

### Postbacks
`GET|POST /api/affiliates/postbacks/{maxbounty|flexoffers|impact|generic}`
- Secret: `AFFILIATE_POSTBACK_SECRET` (≥ 24 chars) as `?key=` or the `x-postback-key` header. Missing/wrong → 403.
- Optional `program=<registry id>` and `currency=`; Impact maps by `campaign_id` to `network_campaign_id`.
- Rate-limited, idempotent (re-sends update, never duplicate), raw payload scrubbed of secrets.
- Example (MaxBounty, **tokens unverified until seen in-account**):
  `https://8tasks.com/api/affiliates/postbacks/maxbounty?key=<secret>&program=<id>&s2=#S2#&rate=#RATE#`
- FlexOffers macros (per their support docs): `#fobs#`, `#on#`, `#sa#`, `#ca#`, `#clickid#`, `#flx_salesid#`, `#et#`.
- Responses: 200 recorded, 202 unknown program (logged, not stored), 422 missing fields, 404 unknown network.

### Outbound SubIDs
`affiliate_links.subid_param` (admin select): `subId1` (Impact), `clickRef` (Awin), `fobs` (FlexOffers),
`s2` (MaxBounty), `sid` (CJ, unverified). When set, `/go/[id]` appends the click id (random UUID, no PII).
Unset (Dreamstime, JoinBrands, all direct links) → URL is used exactly as stored; the click is still logged.

### Scheduled sync
Vercel Cron `0 14 * * *` (06:00 PST / 07:00 PDT) → `/api/cron/affiliate-sync` (requires `Authorization: Bearer $CRON_SECRET`).
Connectors in `src/lib/affiliates/connectors/` no-op with "credentials not configured" until env vars exist.
Impact is a skeleton (Actions 45-day / Invoices windows); Awin, CJ, FlexOffers, Daisycon are placeholders. Each
run writes `affiliate_sync_runs`; tokens and auth headers are never logged.

| Network | Env vars (names only) | Status |
| --- | --- | --- |
| Impact | `IMPACT_SID`, `IMPACT_TOKEN` (read-only Partner token) | Skeleton, waits for account |
| Awin | `AWIN_API_TOKEN`, `AWIN_PUBLISHER_ID` | Placeholder |
| CJ | `CJ_API_TOKEN`, `CJ_PUBLISHER_ID` | Placeholder |
| FlexOffers | `FLEXOFFERS_API_KEY` | Placeholder (no paid plan without Brad) |
| Daisycon | `DAISYCON_CLIENT_ID`, `DAISYCON_CLIENT_SECRET` (refresh-token storage TBD) | Placeholder |

## For Brands page (`/for-brands`)
Renders `data/site_links.json` rows with `placement` ∋ `for_brands_page` **and** `status = live`
(href = `affiliate_url`, else `sample_url`; blank → no card). `rel="sponsored noopener" target="_blank"`,
disclosure at the top and by each CTA. Currently only JoinBrands. `data/site_links.json` holds only the two
rows from the 2026-11-25 change list; the full 58-row map is still to be imported.

## Provider log
| Provider | Network | Status | Notes |
| --- | --- | --- | --- |
| Dreamstime | direct | live | No affiliate reporting API; manual/CSV |
| JoinBrands | direct | live | PayPal; wallet credits 60 days after JoinBrands is paid; manual/CSV |
