# Design System

Source: founder's **Mobile-First Design Specification** and **Discovery & Design Enhancement Update**
(both 2026-11-26). This file records how they are implemented; the specs themselves win on any conflict.

**Mobile first. Desktop expanded. One design system. One unified experience.**

## Tokens (`src/app/globals.css`)
Dark mode only for now (`<html class="dark">`). Tailwind names in parentheses.

| Token | Hex | Tailwind |
| --- | --- | --- |
| Main background | `#131B2B` | `bg-background` |
| Primary card surface | `#202C3E` | `bg-surface` / `bg-card` |
| Elevated surface | `#304258` | `bg-elevated` |
| Brand emerald | `#53E6A0` | `text-emerald` / `bg-primary` |
| Action button bg / text | `#294D40` / `#83EFBA` | `bg-action text-action-foreground` |
| Primary / secondary text | `#F1F5F9` / `#9DAABD` | `text-foreground` / `text-text-2` |
| Border | `#354258` | `border` |
| Daily 8 surface | `#1D3437` | `bg-daily8` |
| Error / warning / info | `#F87171` / `#FBBF24` / `#7DB8FF` | `text-error` / `text-warning` / `text-info` |

Contrast (WCAG): primary text 15.7:1, secondary on card 6.0:1, emerald on card 8.9:1, action button 6.7:1.
Secondary text on *elevated* is 4.36:1, so small secondary text is never placed on `bg-elevated`.

Typography: Inter (`next/font`). H1 28px mobile → 32px sm → 40px lg. Amounts bold, tabular numerals.
Geometry: 16px page gutter, cards 16px radius / 16px padding, buttons 12px radius, chips fully rounded,
icon containers 48px, touch targets ≥ 44px. Motion is minimal and disabled under reduced motion.

## Layout
- `(site)/layout.tsx`: demo banner (non-production only) → `AppHeader` (64px, sticky) → content → footer →
  `MobileBottomNav` (fixed, < 1024px, safe-area padded; content gets `pb-bottom-nav`).
- ≥ 1024px: the same five destinations move into the header (`DesktopNav`); bottom nav hides.
- Content max width 1280px. Mission grid: 1 col → 2 (md) → 3 (xl). Categories 4×2 → 8 in a row (lg).
  Pathways 2×2 (1 col below 360px) → 4 in a row (lg). Chip rows scroll horizontally on mobile.

## Components (`src/components/app/`)
`BrandWordmark` · `AppHeader` · `DesktopNav` · `MobileBottomNav` (`nav-config.ts`) · `Container` / `SectionHeader` ·
`SearchBar` · `Daily8Card` · `PathwayTile` / `PathwayGrid` · `CategoryTile` / `CategoryGrid` · `FilterChips` ·
`AdvancedFilters` · `LocationPicker` · `MissionCard` / `MissionGrid` · `CompensationDisplay` · `MissionMetadata` ·
`BookmarkButton` (+ `saved-store.ts`) · `StatusPill` · `EmptyState` · `MissionCardSkeleton` / `MissionGridSkeleton` ·
`AffiliateDisclosure` · `HeroIllustration` · `DemoBanner` · `SiteFooter` · `ProviderLogo` · `CountryBadges` · `CategoryIcon`.

## Data-driven configuration (`src/lib/`)
- `taxonomy.ts`: category display (short label, Lucide icon, accent), the four **pathways** (Quick Earnings,
  Local Missions, Create & Earn, Recurring Income) with their subcategory rules, category **tab groups**
  (Content & Media, Mystery Shopping), location-enabled categories, CA/US regions.
- `missions/types.ts`: `Opportunity` display model, `Compensation` union (fixed, range, hourly, variable,
  reimbursement-only, payment + reimbursement, commission, recurring commission, hybrid, non-cash, unknown),
  optional attributes (unknown = absent).
- `missions/compensation.ts`: wording per compensation type. Reimbursement is never added to cash.
- `missions/filters.ts`: home chips + grouped filters (Location, Time, Compensation, Requirements, Ways to earn),
  pathway assignment, keyword search. **Unknown data never matches a filter**; chips with no matches are disabled.
- `missions/metadata.ts`: picks the 2–3 most useful facts for cards; detail pages show all.
- `missions/demo-data.ts`: 20 labelled demo listings for the prototype; loaded only when
  `shouldShowDemoData()` (never when `VERCEL_ENV=production`), never written to the database.

## Hero artwork
`HeroIllustration` is the site's only graphic (founder-approved exception): a phone listing four categories with a
survey card and a usability-test checklist. Static, decorative (`aria-hidden`), no figures; shown at ≥ 1024px only.

## Rules carried into the UI
- Provider-level listings say "Provider", use "Explore Provider", show "Subject to eligibility".
- Purchase-required listings show a warning-coloured "Purchase required"; detail pages separate cash payment,
  reimbursement and upfront spending.
- Commission / recurring listings always state they are performance-based and not guaranteed.
- Demo and Sponsored labels use text, not colour alone.
- Creator Partner Program (promoting 8Tasks) is shown separately from Create & Earn (companies paying for content).
