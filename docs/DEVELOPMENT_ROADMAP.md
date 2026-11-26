# Development Roadmap

## Phase 1–2: foundation + discovery MVP (in progress)
- [x] Scaffold Next.js + TS + Tailwind + shadcn/ui
- [x] Schema + RLS + roles + audit log + redirect function (local + Neon `main`)
- [x] Seed 8 categories (Neon: categories only) + local demo data
- [x] Layout, navigation, homepage, category page, providers list
- [x] `/go/[id]` redirect + click logging
- [x] Placeholder legal pages (marked draft)
- [x] Provider profile pages (`/providers/[slug]`)
- [x] Canada + US market filter
- [x] Admin bootstrap CLI (`npm run admin:create`)
- [x] Admin UI: login + mandatory TOTP, providers, affiliate links, opportunities, categories/subcategories, audit log (all via `requireAdmin()`, audit-logged)
- [ ] Provider onboarding: research + affiliate applications (Grok prompt in `docs/GROK_PROVIDER_RESEARCH_PROMPT.md`)
- [x] Mobile-first design system + discovery UI (demo data)
- [x] Search + filters (keyword search; filters only on verified data)
- [ ] Add compensation/attribute/location columns + admin fields (DATABASE.md "Planned columns")
- [ ] Move pathways/category tabs into admin-managed tables
- [ ] PWA manifest + icons (needs final logo)
- [ ] Final legal copy (founder/legal review)
- [x] Playwright admin flow script (`npm run test:e2e`, local only)
- [ ] CI (lint, typecheck, test, build)
- [x] Neon preview branch + runtime/admin login roles + preview-only Vercel env vars
- [x] Production Neon login roles + production env vars
- [x] Production deploy (approved 2026-11-26)
- [ ] Cloudflare DNS for 8tasks.com → Vercel
- [ ] Create production admin account
- [ ] Final legal copy before promoting the site

## Later (not approved yet)
User accounts, My Daily 8, creator program, conversion ingestion, AI workflows, PWA install.
