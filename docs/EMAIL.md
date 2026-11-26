# Email (Resend) and My Daily 8

Free, opt-in email that brings people back to 8Tasks. **Sending is off until the founder approves**
(test emails, consent flow, limits, sender address).

## How it works
- **Sign-up** (`/daily-8`, no account): email + optional preferences (country/province/state/city,
  categories, creative interests, remote/local, beginner-only, equipment, pay types, time zone from the
  browser) and an unticked consent box. Stored via `email_subscribe()` as **pending**, with consent text,
  version (`CONSENT_VERSION`), source and time.
- **Double opt-in**: a confirmation email links to `/email/confirm?token=…` (a button, not a GET, so mail
  scanners can't confirm). Then `active` and a welcome email. Existing active/bounced/complained or
  suppressed addresses are never changed by sign-up; responses are identical (no enumeration).
- **Preferences** `/email/preferences?token=…` (daily / weekly / matching alerts / website only).
  **Unsubscribe** `/email/unsubscribe?token=…` (button) and RFC 8058 one-click
  `POST /api/email/unsubscribe?token=…` (List-Unsubscribe headers on every promotional email).
- **My Daily 8** (`src/lib/email/daily8.ts`, rules only, no AI): up to 8 listings that are published,
  non-demo, linked, not closed, in the subscriber's country, match remote/local/beginner/equipment/pay
  rules and at least one chosen interest, from providers with **allows email traffic = yes**. One listing
  per provider; items emailed in the last 7 days rank lower. **Never padded**: fewer than 8 is fine; no
  matches or nothing new = the email is skipped and recorded as `skipped`.
- **Schedule**: Vercel Cron hourly (`/api/cron/email`, `Bearer $CRON_SECRET`). Sends when the subscriber's
  local time reaches `send_hour` (default 8 AM); weekly on the configured weekday. Idempotent
  (`send_key = campaign:subscriber:local-date`, plus Resend idempotency key), up to 3 attempts for
  failures, daily/monthly limits, batch size, ~600 ms between sends.
- **Links**: buttons go to `/e/<send>/<listing>` → logs the click (only for listings in that email) →
  `/missions/<id>?utm_source=email…`. Affiliate redirection still happens only from the site via `/go`,
  so no tracking parameters are added to provider URLs and creator attribution rules are untouched.
- **Webhooks**: `POST /api/email/webhooks/resend` (Svix signature with `RESEND_WEBHOOK_SECRET`, 5-minute
  window, idempotent on `svix-id`). Permanent bounces and complaints → `email_suppressions` and the
  subscriber is marked bounced/complained. Opens are recorded but labelled unreliable.
- **Admin** `/admin/email`: counts (active, daily, weekly, alerts, website-only, pending, unsubscribed,
  bounced, complained), sends, delivered/bounce/complaint/open events, click-through (our redirect),
  projected monthly volume vs the plan quota you enter, volume warnings, pause, campaign toggles,
  limits, batch size, weekly day, sender name + postal address + reply-to, send test email (works
  with only `RESEND_API_KEY`), preview a Daily 8 (sample or any subscriber), run the scheduler now,
  subscriber list with consent records, suppression list.

## When is mail actually sent?
| Mail | Needs |
| --- | --- |
| Admin test email | `RESEND_API_KEY` |
| Confirmation / welcome | `RESEND_API_KEY` + `EMAIL_SENDING_ENABLED=true` (+ "Confirmation emails" on) |
| Daily / Weekly 8 | the above + admin **pause off** + **postal address** set + campaign on + within limits |
Anything else is a **dry run**: rendered and recorded, not sent.

## Founder setup (in this order)
1. **DNS for 8tasks.com** (Cloudflare, DNS only / grey cloud). Domain added in Resend on 2026-11-26:
   | Type | Name | Value |
   | --- | --- | --- |
   | TXT | `resend._domainkey` | DKIM key shown in Resend → Domains → 8tasks.com |
   | MX (priority 10) | `send` | `feedback-smtp.us-east-1.amazonses.com` |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
   | CNAME | `rsend` | `send.forge.rmta.net` |
   | TXT | `_dmarc` | `v=DMARC1; p=none;` (add `rua=mailto:…` with a mailbox you read; tighten to `quarantine` later) |
2. **API key**: Resend → API Keys → create "8Tasks" (sending access, domain 8tasks.com). Vercel env
   `RESEND_API_KEY` (Production + Preview, Sensitive).
3. **Webhook** (after the code is deployed): Resend → Webhooks → `https://8tasks.com/api/email/webhooks/resend`,
   events delivered, bounced, complained, opened, clicked, delivery_delayed. Copy its signing secret to
   `RESEND_WEBHOOK_SECRET`.
4. `CRON_SECRET` (shared with the affiliate sync).
5. In `/admin/email`: postal address (CAN-SPAM/CASL), reply-to, plan quota/cost from Resend, limits.
   Mark providers "Allows email traffic = Yes" only with their permission.
6. Send test emails to yourself; approve; then set `EMAIL_SENDING_ENABLED=true` and un-pause.

## Costs
The connected Resend account is **shared** with other projects (theprimespirit.com, rayd8.app).
On 2026-11-26 it reported a 50,000 emails/month limit, no daily cap, 10 requests/second,
108 emails used this month. The plan name and price were not verifiable from here (resend.com is
blocked in this environment); confirm them in Resend → Billing. Volume estimate: 100 daily subscribers
≈ 3,000 emails/month. Plans are never upgraded automatically.

## Templates (`src/lib/email/templates/`)
My Daily 8 / My Weekly 8, confirm subscription, welcome, new mission alert, account verification,
password reset, creator partner welcome, promotional asset announcement, creator commission statement
(no figures in the email body), admin provider alert. HTML + plain text, inline styles, no images
required, approved palette, footer: "8Tasks.com — Small Missions. Real Money." / "Always Free. For Everyone."

## Not yet (Phase 3)
Matching-opportunity alerts (preference stored; not sent), creator partner mail, advanced attribution,
saved/viewed-item personalisation (those live in the browser today; no accounts).
