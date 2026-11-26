# 8Tasks

Affiliate-powered discovery site for earning opportunities ("Missions") from third-party providers.
Start with [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs).

## Stack
Next.js 15 (App Router, TypeScript strict) · Tailwind v4 + shadcn/ui · Postgres on Neon via Drizzle ·
Better Auth (admin + TOTP MFA) · Zod · Vitest. Hosting target: Vercel.

## Local development
Requires Node 22 and a local Postgres 16+.

```bash
npm install
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
```

Create the local database and roles (once), as a Postgres superuser:

```sql
create role eighttasks_owner login createrole password 'owner_local_pw';
create database eighttasks owner eighttasks_owner;
create role eighttasks_app   login password 'app_local_pw';
create role eighttasks_admin login password 'admin_local_pw';
```

Then:

```bash
npm run db:migrate                # as owner; creates tables, RLS, app_runtime/app_admin roles
psql -d eighttasks -c "grant app_runtime to eighttasks_app; grant app_admin to eighttasks_admin;"
npm run db:seed                   # 8 categories + flagged demo providers (never in production)
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                       # then sign in at http://localhost:3000/admin/login
```

## Scripts
| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest |
| `npm run db:generate` | Generate a migration from `src/db/schema` |
| `npm run db:migrate` | Apply migrations (uses `MIGRATION_DATABASE_URL`) |
| `npm run db:seed [-- --categories-only]` | Seed categories (+ demo data outside production) |
| `npm run admin:create -- --email you@x.com --name "You"` | Create/promote an admin (prompts for password) |
| `npm run test:e2e` | Local Playwright admin flow (needs a fresh admin without 2FA; see `tests/e2e/admin-flow.cjs`) |

## Environment variables
See [`.env.example`](.env.example). Never commit real values.
