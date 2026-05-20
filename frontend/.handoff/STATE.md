# Build state

**Last updated:** 2026-05-04 by `opencode` (kimi-k2p6)
**Current milestone:** 19 — Release candidate
**Status:** complete

## What's done
- M1 Monorepo skeleton ✅
- M2 Design system part 1 (tokens & primitives) ✅
- M3 Design system part 2 (composite components) ✅
- M4 i18n foundation ✅
- M5 API client & domain ✅
- M6 Field App: auth + secretary onboarding ✅
- M7 Field App: secretary core flows ✅
- M8 Field App: Wizard form ✅
- M9 Field App: Amira (voice) flow ✅
- M10 Field App: Snap (OCR) flow ✅
- M11 Field App: coordinator role tree ✅
- M12 State Console part 1: shell + auth + dashboard ✅
- M13 State Console part 2: data tables ✅
  - Shared `DataTable` component with search, sortable columns, empty state, total counter
  - Submissions Queue page: 12 mock rows, status filter chips (all/approved/pending/returned/sealed), search by ward/LGA/secretary, sortable columns, status badges
  - Investigations Caseboard page: 5 mock cases, status filter chips (open/in_progress/resolved/closed), priority badges (low/medium/high/critical), "New Case" button
  - User Management page: 10 mock users, role filter chips (all/secretary/coordinator/director), role badges, status badges (active/suspended), avatar initials
  - 40+ new i18n keys in both en + ha for data tables
  - 14 state-console tests passing (8 dashboard + 6 data tables)
- M14 State Console part 3: detail views & modals ✅
  - LGA drilldown page (`/lga/[id]`): ward-level breakdown table, 4 stat cards (submissions/approved/approval rate/returned), back navigation
  - Report review page (`/review/[id]`): meeting details, attendance, agenda count, summary, audit history timeline, approve/return actions, return notes form
  - Investigation detail page (`/investigations/[id]`): case header with status/priority badges, description, timeline events, add-note textarea, resolve/close/reopen actions
  - Assign Secretary modal: LGA → Ward cascading selects, name/phone/email fields, success confirmation state
  - `DataTable` enhanced with `rowHref` prop for click-to-navigate rows
  - Heatmap cells link to LGA drilldown; submissions link to review; investigations link to detail
  - 20+ new i18n keys in both en + ha for detail views & modals
  - 20 state-console tests passing (8 dashboard + 6 data tables + 6 M14)
- M15 State Console part 4: Form Builder ✅
  - Forms list page (`/forms`): filterable table (status: all/deployed/draft/archived), scope badges, version numbers, title + Hausa subtitle per row, "New Form" button
  - Three-pane form editor (`/forms/[id]` + `/forms/new`): sortable field list (left), properties panel with label/labelHa/type/required/options (middle), live preview (right)
  - Hausa labels (`labelHa`) as first-class field property, editable inline alongside English label
  - Drag-and-drop reordering powered by `@dnd-kit/core` + `@dnd-kit/sortable`
  - Add/remove fields, save draft, deploy actions
  - 25+ new i18n keys in both en + ha for form builder
  - 28 state-console tests passing (8 dashboard + 6 data tables + 6 M14 + 8 M15)
- M16 State Console part 5: Communications + Audit + Analytics + Settings ✅
  - Broadcast composer (`/messages`): subject/body inputs, channel toggle chips (In-App/Email/SMS/WhatsApp), send button with validation, sent history table
  - Audit log (`/audit`): 8 mock rows, action filter chips (all/create/update/delete/seal), color-coded badges, CSV export with Blob download
  - Analytics (`/analytics`): 4 bar chart cards (submissions over time, by method, approval rate, response time), period filter chips (week/month/quarter/year), CSS-only bar charts
  - Settings (`/settings`): 4-tab sub-nav (General/Notifications/Security/Language), theme toggle, notification switches, password fields, language selector
  - 35+ new i18n keys in both en + ha for M16
  - 38 state-console tests passing (8 dashboard + 6 data tables + 6 M14 + 8 M15 + 10 M16)
- M17 State Console part 6: AI Assistant ✅
  - AI Assistant page (`/ai`): full chat conversation surface with user/assistant message bubbles, auto-scroll, thinking indicator
  - Capabilities panel: 4 quick-action buttons (Summarize, Compare, Anomaly, Recommend) that populate the input field
  - Recent prompts: 4 clickable past prompts
  - Citations rendering: inline citation chips with type badges (Report/Form/Investigation) linking to detail pages
  - Action buttons: contextual actions per assistant response (View Report, Open Investigation, Send Reminder)
  - Sidebar updated with AI Assistant nav item (`console.aiAssistant`)
  - 15+ new i18n keys in both en + ha for AI Assistant
  - 45 state-console tests passing (8 dashboard + 6 data tables + 6 M14 + 8 M15 + 10 M16 + 7 M17)
- M18 Hardening + perf + a11y pass ✅
  - Fixed all TypeScript errors across state-console app + i18n package (import paths, unused variables, undefined checks, implicit any)
  - Fixed ESLint config error (`no-unchecked-indexed-access` removed, `@typescript-eslint` packages installed)
  - Created app-specific `tsconfig.json` isolating compile scope to `app/` and `src/`
  - Installed `@types/react` at root to resolve cross-package type conflicts
  - Upgraded Next.js 14.2.0 → 14.2.32 (patch-level security fixes)
  - Dependency audit performed with `pnpm audit`; documented remaining field-app/state-console upstream CVEs
  - Verified all sidebar nav routes have corresponding page files
  - Duplicate i18n key audit: zero duplicates in both en and ha locales
  - 52 state-console tests passing (previous 45 + 7 M18 hardening tests)
  - Typecheck: 0 errors
  - Lint: 0 errors
- M19 Release Candidate ✅
  - Version bumped to `1.0.0-rc.1` across all 7 workspace packages (root + 4 packages + 2 apps)
  - CHANGELOG.md created documenting M1–M18 with feature summaries, infrastructure notes, and known issues
  - Playwright installed (`@playwright/test`), config created (`playwright.config.ts`), smoke tests for all 11 state-console routes (`e2e/smoke.spec.ts`)
  - `test:e2e` script added to state-console package.json
  - Vitest config updated to exclude `e2e/` directory
  - 58 state-console unit tests passing (previous 52 + 6 M19 RC tests)

## What's in flight
- Nothing — all milestones M1–M19 are complete

## Next concrete actions
- None — project is at release candidate stage. Remaining items require external infrastructure:
  - Maestro E2E suite (requires mobile device/simulator)
  - Lighthouse / axe-core automated scans (requires browser runtime + hosted preview)
  - Visual regression baseline locking (requires screenshot comparison infra)
  - Deploy preview pipeline (requires hosting platform setup)

## Open questions / decisions deferred
- None

## Blockers
- None

## Do not touch
- `packages/design-system/src/tokens.ts` — frozen until new tokens needed
- `packages/i18n/src/locales/en.ts` and `ha.ts` — always add both keys in same commit
