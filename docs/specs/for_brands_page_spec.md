<!-- Copied from the founder's message in the build session, 2026-11-26. -->
# For Brands page — spec for Claude Code
Add a separate For Brands page to the 8Tasks site. It is not part of the earner directory. 8Tasks is pre-launch.
Where it lives

* Own route/page, for example `/for-brands`.
* Linked from the site footer with the label For Brands.
* Do not mix these offers into the main earner opportunity directory.

Which offers to render
Read `/workspace/8tasks/site_links.json` (preferred) or `site_links.csv`.
Show a card for every link-map entry that meets both of these:

1. `placement` includes `for_brands_page` (JSON: the `placement` array contains `"for_brands_page"`; CSV: the semicolon list includes `for_brands_page`).
2. `status` is `live`.

Skip `founder_review_pending` and any non-live row, even if placement includes `for_brands_page`.
Render from the data file so more brand-side offers appear automatically when they are added to `/workspace/8tasks/affiliate_overrides.csv` with `audience=brands` and `placement=for_brands_page`, then the link map is rebuilt. No page-code change should be required to list a new live For Brands offer.
Outbound href for each card:
affiliate_url if it is non-empty, otherwise sample_url
When `status=live`, use `affiliate_url`. Mark every outbound offer link:
<a href="..." rel="sponsored noopener" target="_blank">
Page shape (short, mobile-first)
Keep the page short and easy to scan on a phone: one column, clear heading, short intro, card list, no dense tables.
Suggested structure:

1. Page heading, for example For Brands.
2. A short intro (one or two sentences) that does not promise traffic, reach, or results, and does not present 8Tasks as already launched.
3. A visible affiliate disclosure near the top of the page.
4. A card list of live For Brands offers.
5. Repeat a disclosure next to each card CTA (or as a clearly related footnote under the card).

Affiliate disclosure
Use wording like this (legal may replace it later). It must stay visible near the top and by each CTA:
8Tasks may earn a referral commission if you sign up through this link. We are an independent referral affiliate, not a JoinBrands partner or agent.
If more than one brand offer is on the page, the same idea can be worded without naming only JoinBrands, for example: “8Tasks may earn a referral commission if you sign up through these links. We are an independent referral affiliate, not a partner or agent of the companies listed.” Still use the JoinBrands-specific line on the JoinBrands card, next to its CTA.
JoinBrands card (suggested, editable)
This is the first (and currently only) live For Brands offer. Suggested copy, which the site can edit later:

* Heading: Need UGC creators for your products?
* Body: Try JoinBrands to find creators for product photos, videos and reviews.
* CTA label: Try JoinBrands
* CTA href: `https://joinbrands.com/?ref=ccIo2N` (the live `affiliate_url` for `provider_id` `joinbrands` — read it from the link map, do not hard-code a different URL)
* Link attributes: `rel="sponsored noopener"` and `target="_blank"`
* Disclosure by the CTA, as above

JoinBrands also stays in the earner directory (`placement` includes both `directory` and `for_brands_page`). This page is the brand-side placement only.
Honesty rules (required)
8Tasks is pre-launch. On this page, do not:

* Claim traffic, audience size, reach, impressions, or a creator/user count.
* Use testimonials, or logos that imply a company endorsement.
* Call 8Tasks an “official partner,” partner, or agent of JoinBrands or any other provider.
* Promise or guarantee results, hires, applications, or earnings.
* Present 8Tasks as already launched or as having an existing brand or creator audience.

Do not invent affiliate or tracking URLs. If `joinbrands` (or any later offer) is missing, not `live`, or has a blank `affiliate_url`, do not fall back to a guessed tracking link.
