# Affiliate Integrations

No real providers or affiliate programmes are integrated yet. Phase 0 (founder applying to the first 5–8
providers) runs in parallel.

## Rules
- Capabilities are per-provider facts in `providers` (`supports_sub_ids`, `supports_postbacks`,
  `provides_feed`, `allows_revenue_share`), default **unknown**. Record a value only from the
  provider's own documentation or written confirmation, and note the source in `admin_notes`.
- Tracking URLs go in `affiliate_links` (https only) and are only ever used via `/go/[id]`.
- Individual missions require authorized data (`data_source = authorized_feed | authorized_manual`).
- Provider-supplied text is untrusted data (CLAUDE.md rule 7).

## Provider log
| Provider | Network | Status | Capabilities confirmed | Notes |
| --- | --- | --- | --- | --- |
| _none yet_ | | | | |
