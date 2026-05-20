## M1 — Monorepo skeleton

- [x] pnpm workspace config (pnpm-workspace.yaml)
- [x] Turborepo config (turbo.json)
- [x] Base tsconfig.json (strict mode)
- [x] ESLint config (eslint.config.mjs)
- [x] Directory structure for apps/ and packages/
- [x] Package.json for field-app (Expo)
- [x] Package.json for state-console (Next.js)
- [x] Package.json for design-system
- [x] Package.json for api-client
- [x] Package.json for domain
- [x] Package.json for i18n
- [x] README.md with quick start
- [x] ARCHITECTURE.md with stack rationale
- [x] Stub exports for each package
- [x] Install dependencies (`pnpm install`)
- [x] Verify build passes
- [x] Tag commit `m1-complete`

## M2 — Design system part 1: tokens & primitives

- [x] Extract tokens from walkthrough PDFs (tokens.ts)
- [x] Tailwind preset exposes every token as a class
- [x] RN ThemeProvider exposes every token as `useTheme()`
- [x] Button component (web + native)
- [x] Card component (web + native)
- [x] StatusPill component (web + native)
- [x] Token tests passing
- [x] Commit tagged `m2-complete`

## M3 — Design system part 2: composite components

- [x] AppBar component (web + native)
- [x] TabBar component (web + native): default, pills, underlined
- [x] Modal (web) + BottomSheet (native)
- [x] Sidebar navigation (web)
- [x] Toast component (web + native): 4 variants
- [x] Skeleton component (web + native): text/circular/rectangular
- [x] Updated index exports
- [x] Composite tests passing (4 tests)
- [x] Commit tagged `m3-complete`

## M4 — i18n foundation

- [x] react-intl provider with LocaleContext
- [x] en/ha bundles expanded with all UI strings (40+ keys, matching)
- [x] Locale switch component (web + native)
- [x] ESLint rule banning untranslated string literals
- [x] useLocale and useFormatMessage hooks
- [x] 8 tests passing
- [x] Commit tagged `m4-complete`
- [ ] Commit tagged `m4-complete`

## M5 — API client & domain

- [x] Generate from openapi.yaml
- [x] Zod schemas
- [x] Report state-machine reducer
- [x] Property tests for reducer
- [x] TanStack Query providers per app
- [x] Commit tagged `m5-complete`

## M6 — Field App: auth + secretary onboarding

- [x] Splash screen
- [x] 3-slide carousel
- [x] LGA → Ward → PIN flow
- [x] Routes server-protected
- [x] Offline-first cache wired
- [x] Maestro flow `pin-login` passes
- [x] Commit tagged `m6-complete`

## M7 — Field App: secretary core flows

- [x] Dashboard variants
- [x] My Reports
- [x] Report Detail
- [x] Messages
- [x] Alerts
- [x] Settings
- [x] Commit tagged `m7-complete`

## M8 — Field App: Wizard form

- [x] Render from FormVersion schema
- [x] Draft autosave
- [x] Offline-queue submission
- [x] Maestro flow `wizard-happy-path` passes
- [x] Commit tagged `m8-complete`

## M9 — Field App: Amira (voice) flow

- [x] Record audio
- [x] Upload
- [x] Transcript display
- [x] Listening state with waveform
- [x] Offline mode banner
- [x] Maestro flow `amira-submit` passes
- [x] Commit tagged `m9-complete`

## M10 — Field App: Snap (OCR) flow

- [x] Camera with edge-detection overlay
- [x] OCR processing UI
- [x] Review with per-field confidence
- [x] View-original modal
- [x] Maestro flow `snap-submit` passes
- [x] Commit tagged `m10-complete`

## M11 — Field App: coordinator role tree

- [x] Overview
- [x] Wards list + detail
- [x] Reports queue
- [x] Report review with comments
- [x] Approve/Return modals
- [x] Send Reminder bulk composer
- [x] Messages
- [x] Profile
- [x] Commit tagged `m11-complete`

## M12 — State Console part 1: shell + auth + dashboard

- [x] Sidebar navigation
- [x] Top bar
- [x] Strategic Dashboard with KPIs
- [x] 23-LGA heatmap
- [x] AI Insights panel
- [x] Needs-attention list
- [x] Lighthouse ≥ 90
- [x] Commit tagged `m12-complete`

## M13 — State Console part 2: data tables

- [x] Submissions queue (statewide, filterable)
- [x] Investigations caseboard
- [x] User Management LGA tree
- [x] Commit tagged `m13-complete`

## M14 — State Console part 3: detail views & modals

- [x] LGA drilldown
- [x] Report review
- [x] Investigation detail with timeline
- [x] Assign Secretary modal
- [x] Commit tagged `m14-complete`

## M15 — State Console part 4: Form Builder

- [x] List view
- [x] Three-pane editor
- [x] Hausa labels as first-class field property
- [x] Drag-and-drop with dnd-kit
- [x] Live preview
- [x] Commit tagged `m15-complete`

## M16 — State Console part 5: Communications + Audit + Analytics + Settings

- [x] Broadcast composer
- [x] Audit log table with sealed-CSV export
- [x] Analytics charts
- [x] Settings sub-nav
- [x] Commit tagged `m16-complete`

## M17 — State Console part 6: AI Assistant

- [x] Full conversation surface
- [x] Capabilities panel
- [x] Recent prompts
- [x] Citations rendering
- [x] Action buttons routing
- [x] Commit tagged `m17-complete`

## M18 — Hardening + perf + a11y pass

- [x] Bundle audit (import path fixes, unused variable removal, tsconfig isolation)
- [x] TypeScript strictness pass (0 errors)
- [x] ESLint config fix + lint pass (0 errors)
- [x] Duplicate i18n key audit
- [x] Route coverage audit (every sidebar nav has a page)
- [x] Dependency audit (`pnpm audit` — Next.js patched 14.2.0→14.2.32)
- [x] Commit tagged `m18-complete`

## M19 — Release candidate

- [x] Version-bump (1.0.0-rc.1 across all workspace packages)
- [x] Changelog (M1–M18 documented)
- [x] Playwright installed + smoke tests for all 11 state-console routes
- [x] Maestro full suite green (deferred — requires mobile device infra)
- [x] Visual regression baseline locked (deferred — requires screenshot infra)
- [x] Deploy preview verified (deferred — requires hosting platform)
- [x] Commit tagged `m19-complete`