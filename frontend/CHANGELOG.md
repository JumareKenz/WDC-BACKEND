# Changelog

All notable changes to the WDC Kaduna State Digital Reporting Platform frontend.

## 1.0.0-rc.1 — 2026-05-04

### Milestones M1–M18

#### M1 — Monorepo Skeleton
- pnpm workspaces + Turborepo
- 3 apps (field-app, state-console, design-system) + 5 packages (api-client, domain, i18n)
- ESLint, TypeScript strict mode, shared tsconfig

#### M2 — Design System Part 1: Tokens & Primitives
- Design tokens extracted from walkthrough PDFs (`tokens.ts`)
- Tailwind preset + RN ThemeProvider
- Button, Card, StatusPill components (web + native)

#### M3 — Design System Part 2: Composite Components
- AppBar, TabBar (default/pills/underlined), Modal, BottomSheet
- Sidebar navigation, Toast (4 variants), Skeleton (text/circular/rectangular)

#### M4 — i18n Foundation
- react-intl provider with LocaleContext
- English + Hausa bundles (200+ matching keys)
- Locale switch component, useLocale / useFormatMessage hooks
- ESLint rule banning untranslated string literals

#### M5 — API Client & Domain
- OpenAPI-generated typed fetch client (`@wdc/api-client`)
- Zod validation schemas + exhaustive report state-machine reducer
- 37 domain tests passing

#### M6 — Field App: Auth + Onboarding
- 3-slide onboarding carousel, LGA → Ward → PIN flow
- AsyncStorage auth persistence, protected routes
- 4 field-app tests passing

#### M7 — Field App: Secretary Core Flows
- 5-tab layout (Dashboard, Reports, Messages, Alerts, Settings)
- Dashboard with stat cards, My Reports list with search/filters
- Report Detail with submit action
- 11 field-app tests passing

#### M8 — Field App: Wizard Form
- Schema-driven 8-field step form with draft autosave (800ms debounce)
- Offline queue submission
- 27 field-app tests passing

#### M9 — Field App: Amira (Voice) Flow
- useAudioRecorder hook with state machine + animated waveform
- Transcript display, offline mode banner
- 32 field-app tests passing

#### M10 — Field App: Snap (OCR) Flow
- useOcr hook, edge-detection overlay, progress bar
- Review with per-field confidence badges (High/Medium/Low), editable fields
- View Original modal
- 38 field-app tests passing

#### M11 — Field App: Coordinator Role Tree
- Role-aware tab layout, Coordinator Overview (LGA stats + wards list)
- Review Queue with approve/return, Send Reminder bulk composer
- 44 field-app tests passing

#### M12 — State Console Part 1: Shell + Dashboard
- Next.js 14 App Router, collapsible sidebar (9 nav items), top bar
- Strategic Dashboard: 5 KPI cards, 23-LGA heatmap, AI Insights panel, Needs Attention list
- 8 state-console tests passing

#### M13 — State Console Part 2: Data Tables
- Shared DataTable component (search, sort, filter, empty state)
- Submissions Queue, Investigations Caseboard, User Management
- 14 state-console tests passing

#### M14 — State Console Part 3: Detail Views & Modals
- LGA drilldown (`/lga/[id]`), Report review (`/review/[id]`)
- Investigation detail with timeline (`/investigations/[id]`)
- Assign Secretary modal
- 20 state-console tests passing

#### M15 — State Console Part 4: Form Builder
- Forms list page with status filters, three-pane editor
- Drag-and-drop field reordering (`@dnd-kit`)
- Hausa labels (`labelHa`) as first-class field property
- Live preview pane
- 28 state-console tests passing

#### M16 — State Console Part 5: Communications + Audit + Analytics + Settings
- Broadcast composer (`/messages`) with channel toggles + history
- Audit log (`/audit`) with CSV export
- Analytics (`/analytics`) with CSS-only bar charts
- Settings (`/settings`) with 4-tab sub-nav
- 38 state-console tests passing

#### M17 — State Console Part 6: AI Assistant
- Full chat conversation surface (`/ai`) with citations + action buttons
- Capabilities panel + recent prompts
- 45 state-console tests passing

#### M18 — Hardening + Perf + A11y Pass
- Fixed all TypeScript errors (import paths, unused vars, undefined checks, implicit any)
- Fixed ESLint config, installed `@typescript-eslint` packages
- App-specific `tsconfig.json`, `@types/react` at root
- Next.js upgraded 14.2.0 → 14.2.32
- Dependency audit (`pnpm audit`)
- Duplicate i18n key audit: zero duplicates
- Route coverage audit: every sidebar nav has a page
- 52 state-console tests passing

### Infrastructure
- **Backend**: NestJS, Drizzle ORM, PostgreSQL, Redis, MinIO (M1–M14 complete)
- **Frontend**: Expo 51 (field app), Next.js 14 (state console), Tailwind CSS, Zustand, TanStack Query
- **i18n**: English + Hausa, 200+ keys
- **Tests**: Vitest (unit), Playwright (e2e — setup in M19)
- **Security**: Next.js patched, dependency audit performed

---

## Unreleased

### Known Issues / Deferred
- Lighthouse/axe-core full sweep (requires browser runtime)
- Maestro mobile E2E full suite (requires device/simulator)
- Visual regression baseline locking (requires screenshot infra)
- Deploy preview pipeline (requires hosting setup)
