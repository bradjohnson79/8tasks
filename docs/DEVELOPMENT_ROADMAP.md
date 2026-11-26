# Development Roadmap

## Phase 1–2: foundation + discovery MVP (in progress)
- [x] Scaffold Next.js + TS + Tailwind + shadcn/ui
- [x] Schema + RLS + roles + audit log + redirect function (local + Neon `main`)
- [x] Seed 8 categories (Neon: categories only) + local demo data
- [x] Layout, navigation, homepage, category page, providers list
- [x] `/go/[id]` redirect + click logging
- [x] Placeholder legal pages (marked draft)
- [ ] Provider profile pages (`/providers/[slug]`)
- [ ] Admin bootstrap CLI (create first admin user, then enrol TOTP)
- [ ] Admin UI: login + 2FA, providers, affiliate links, opportunities, categories (all via `requireAdmin()`, audit-logged)
- [ ] Search + basic filters (only where data is reliable)
- [ ] Final legal copy (founder/legal review)
- [ ] Playwright smoke tests; CI (lint, typecheck, test, build)
- [ ] Neon runtime/admin login roles + Vercel env vars, preview deploys on Neon branches
- [ ] Production deploy (**founder approval required**)

## Later (not approved yet)
User accounts, My Daily 8, creator program, conversion ingestion, AI workflows, PWA install.
