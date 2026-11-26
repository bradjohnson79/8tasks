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
- [ ] Search + basic filters (only where data is reliable)
- [ ] Final legal copy (founder/legal review)
- [x] Playwright admin flow script (`npm run test:e2e`, local only)
- [ ] CI (lint, typecheck, test, build)
- [ ] Neon runtime/admin login roles + Vercel env vars, preview deploys on Neon branches
- [ ] Production deploy (**founder approval required**)

## Later (not approved yet)
User accounts, My Daily 8, creator program, conversion ingestion, AI workflows, PWA install.
