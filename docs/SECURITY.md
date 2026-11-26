# Security

## Database privilege model (CLAUDE.md rule 4)
Authorization is enforced by **which Postgres role the server connects as**, plus RLS on every table.

| Group role (NOLOGIN) | Login role (per env) | Used by | Can do |
| --- | --- | --- | --- |
| `app_runtime` | `DATABASE_URL` user | Public pages, `/go`, Better Auth | Read published/active, non-demo content; no admin columns; no `affiliate_links`; auth tables; execute `resolve_outbound_link` |
| `app_admin` | `ADMIN_DATABASE_URL` user | Admin server code after `requireAdmin()` | CRUD content, read clicks, append audit log |
| owner | `MIGRATION_DATABASE_URL` user | Migrations, seeds (local/CI only) | Everything. **Never** configure in Vercel runtime |

- Column-level grants hide `providers.admin_notes` from `app_runtime`.
- `admin_audit_log` is append-only via trigger, even for the owner.
- RLS on Better Auth tables is permissive for `app_runtime` (the library enforces its own rules).
  Consequence: a SQL-injection bug in runtime code could tamper with auth rows. Mitigations: Drizzle
  parameterised queries only, no raw string SQL, MFA required for admin.
- `app.show_demo` is a transaction setting the server controls. It only affects demo-row visibility,
  and production databases are never seeded with demo rows.

### Neon setup still to do (before first deploy, needs founder approval)
Create two login roles in Neon (console or MCP `create_postgres_role`), then as owner:
`GRANT app_runtime TO <runtime_login>; GRANT app_admin TO <admin_login>;`
Put their **pooled** connection strings in Vercel env vars. Do not reuse the owner credentials.

## Redirects (rule 2)
`/go/[id]` accepts only a UUID. The destination comes from `affiliate_links` via the SECURITY DEFINER
function `resolve_outbound_link`, which checks link active + provider/opportunity published + link belongs
to the opportunity, and logs the click. DB CHECK constraint and route both require `https://`.
Responses are `no-store`, `noindex`, `Referrer-Policy: no-referrer`. Outbound anchors use `rel="sponsored nofollow noopener"`.

## Admin auth
Better Auth email/password, public sign-up disabled, 12-char minimum password, built-in rate limiting,
12h sessions. `requireAdmin()` requires `role = 'admin'`, not banned, and `twoFactorEnabled` (TOTP).
Every admin page/action must call it server-side.

## Secrets
Only in env vars (`.env.local` is git-ignored; `.env.example` holds dummy local values).
The GitHub repo is **public**: never commit real credentials. Nothing secret is sent to the browser:
there are no `NEXT_PUBLIC_*` variables.

## Privacy
Click logs store no IP or user agent string, only device class, bot flag, ISO country from the
hosting edge, and same-origin source path.
