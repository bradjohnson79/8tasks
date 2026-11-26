# Architecture

## Overview
```
Browser ──► Next.js (Vercel, Node runtime)
              ├─ Server components (public pages) ──► withPublicDb() ──► Neon (role: app_runtime, RLS)
              ├─ /go/[id] route ──► resolve_outbound_link() (SECURITY DEFINER) ──► 302 to stored URL
              ├─ /api/auth/* (Better Auth) ──► runtimeDb() ──► auth tables
              └─ Admin (Phase 1, not built yet) ──► requireAdmin() ──► adminDb (role: app_admin)
```

## Key modules
| Path | Purpose |
| --- | --- |
| `src/db/schema/` | Drizzle schema (`app.ts` content tables, `auth.ts` Better Auth tables) |
| `drizzle/` | SQL migrations. `0001_rls_and_guards.sql` is hand-written (roles, grants, RLS, triggers, redirect fn) |
| `src/db/client.ts` | Connection pools; `withPublicDb()` sets the per-transaction RLS context |
| `src/db/queries/public.ts` | All public read queries |
| `src/lib/auth.ts` | Better Auth config (sign-up disabled, admin + two-factor plugins) |
| `src/lib/admin.ts`, `admin-policy.ts` | `requireAdmin()` server gate: role = admin, not banned, MFA enabled |
| `src/lib/demo.ts` | Demo-data visibility (always off when `VERCEL_ENV=production`) |
| `src/app/go/[id]/route.ts` | Affiliate redirect + click logging |
| `src/components/ui/` | shadcn/ui components (hand-copied; registry blocked in the build container) |
| `src/components/site/` | Header, footer, cards, disclosure notice |
| `scripts/seed*.ts` | Idempotent seed (categories; demo data refused in production) |

## Rendering
Public pages are dynamic (`force-dynamic`) for now so the database is the source of truth.
Add caching/ISR once traffic justifies it.

## Database connections
Three connection strings, three Postgres login roles (see `docs/SECURITY.md`):
`DATABASE_URL` (app_runtime), `ADMIN_DATABASE_URL` (app_admin), `MIGRATION_DATABASE_URL` (owner, CI/local only).
Use Neon's **pooled** host for the two runtime URLs on Vercel.
