# Provider import format (`/admin/import`)

Admin-only (admin role + MFA). Upload or paste JSON or CSV → validated with Zod → preview of
creates/updates → apply. **Everything is written as `status = draft`**, including providers that
were already published (the preview warns). Publishing is always a manual admin action.
CLI equivalent (local/admin DB): `npm run import:providers -- <file>`.
Example: `data/import/claude_integration_package.json` (Dreamstime + JoinBrands).

## JSON
```json
{
  "providers": [
    {
      "slug": "joinbrands",
      "public": {
        "name": "JoinBrands",
        "website_url": "https://joinbrands.com/",
        "summary": "…", "description": "…",
        "countries": ["US"],
        "last_verified_at": "2026-11-26",
        "affiliate_url": "https://joinbrands.com/?ref=ccIo2N",
        "opportunities": [
          {
            "slug": "ugc-creator-jobs", "title": "Create UGC for brands", "summary": "…",
            "category": "content-media", "subcategory": "user-generated-content",
            "secondary": [{ "category": "photography", "subcategory": "product-photos" }],
            "subsections": ["film-earn", "capture-earn"],
            "compensation_type": "variable",
            "compensation_note": "Pay varies by job; some jobs include a free product (not cash).",
            "attributes": { "remote": true, "productSupplied": true }
          }
        ]
      },
      "internal": {
        "commission_model": "business_client_referral",
        "commission_text": "…", "commission_currency": "USD",
        "qualifying_action": "…", "tracking_window": "…", "recurring_commission": true,
        "source_urls": ["https://…"], "readiness_level": "A",
        "approval_status": "…", "mission_alignment": "…", "business_contact": "…"
      }
    }
  ]
}
```
- `countries`: `CA` and/or `US` only. URLs must be `https://` on a public host.
- `affiliate_url` is stored only in `affiliate_links` exactly as given (fragments and `?ref=` kept); never rendered.
- `internal` goes to the admin-only `provider_internal` table and is never shown publicly.
- `compensation_type`: unknown, fixed, range, hourly, variable, reimbursement_only, payment_plus_reimbursement,
  commission, hybrid, non_cash, gift_card, free_product, competition_prize, licensing_royalties.
  (Amounts are entered by an admin in the opportunity form after verification.)
- `attributes`: only known keys from `src/lib/missions/types.ts` (`ATTRIBUTE_KEYS`); unknown keys are dropped.
- Unknown category/subcategory/subsection slugs reject the whole import. Any `status` field is ignored.
- Upsert keys: provider `slug`; opportunity `(provider, slug)`. Secondary categories and subsection memberships are replaced.

## CSV
One row per provider + opportunity (rows with the same `slug` form one provider; provider/internal
columns are read from the first row). Lists use `;`. Secondary placements are `category/subcategory`.
Attributes are `key=yes;key=no`. Header (exact):
```
slug,name,website_url,summary,description,countries,last_verified_at,affiliate_url,opportunity_slug,opportunity_title,opportunity_summary,category,subcategory,secondary,subsections,compensation_type,compensation_note,attributes,commission_model,commission_text,commission_currency,qualifying_action,tracking_window,recurring_commission,source_urls,readiness_level,approval_status,mission_alignment,business_contact
```
