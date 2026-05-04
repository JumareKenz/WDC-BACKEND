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

- [ ] Generate from openapi.yaml
- [ ] Zod schemas
- [ ] Report state-machine reducer
- [ ] Property tests for reducer
- [ ] TanStack Query providers per app
- [ ] Commit tagged `m5-complete`

## M6 — Field App: auth + secretary onboarding

- [ ] Splash screen
- [ ] 3-slide carousel
- [ ] LGA → Ward → PIN flow
- [ ] Routes server-protected
- [ ] Offline-first cache wired
- [ ] Maestro flow `pin-login` passes
- [ ] Commit tagged `m6-complete`

## M7 — Field App: secretary core flows

- [ ] Dashboard variants
- [ ] My Reports
- [ ] Report Detail
- [ ] Messages
- [ ] Alerts
- [ ] Settings
- [ ] Commit tagged `m7-complete`

## M8 — Field App: Wizard form

- [ ] Render from FormVersion schema
- [ ] Draft autosave
- [ ] Offline-queue submission
- [ ] Maestro flow `wizard-happy-path` passes
- [ ] Commit tagged `m8-complete`

## M9 — Field App: Amira (voice) flow

- [ ] Record audio
- [ ] Upload
- [ ] Transcript display
- [ ] Listening state with waveform
- [ ] Offline mode banner
- [ ] Maestro flow `amira-submit` passes
- [ ] Commit tagged `m9-complete`

## M10 — Field App: Snap (OCR) flow

- [ ] Camera with edge-detection overlay
- [ ] OCR processing UI
- [ ] Review with per-field confidence
- [ ] View-original modal
- [ ] Maestro flow `snap-submit` passes
- [ ] Commit tagged `m10-complete`

## M11 — Field App: coordinator role tree

- [ ] Overview
- [ ] Wards list + detail
- [ ] Reports queue
- [ ] Report review with comments
- [ ] Approve/Return modals
- [ ] Send Reminder bulk composer
- [ ] Messages
- [ ] Profile
- [ ] Commit tagged `m11-complete`

## M12 — State Console part 1: shell + auth + dashboard

- [ ] Sidebar navigation
- [ ] Top bar
- [ ] Strategic Dashboard with KPIs
- [ ] 23-LGA heatmap
- [ ] AI Insights panel
- [ ] Needs-attention list
- [ ] Lighthouse ≥ 90
- [ ] Commit tagged `m12-complete`

## M13 — State Console part 2: data tables

- [ ] Submissions queue (statewide, filterable)
- [ ] Investigations caseboard
- [ ] User Management LGA tree
- [ ] Commit tagged `m13-complete`

## M14 — State Console part 3: detail views & modals

- [ ] LGA drilldown
- [ ] Report review
- [ ] Investigation detail with timeline
- [ ] Assign Secretary modal
- [ ] Commit tagged `m14-complete`

## M15 — State Console part 4: Form Builder

- [ ] List view
- [ ] Three-pane editor
- [ ] Hausa labels as first-class field property
- [ ] Drag-and-drop with dnd-kit
- [ ] Live preview
- [ ] Commit tagged `m15-complete`

## M16 — State Console part 5: Communications + Audit + Analytics + Settings

- [ ] Broadcast composer
- [ ] Audit log table with sealed-CSV export
- [ ] Analytics charts
- [ ] Settings sub-nav
- [ ] Commit tagged `m16-complete`

## M17 — State Console part 6: AI Assistant

- [ ] Full conversation surface
- [ ] Capabilities panel
- [ ] Recent prompts
- [ ] Citations rendering
- [ ] Action buttons routing
- [ ] Commit tagged `m17-complete`

## M18 — Hardening + perf + a11y pass

- [ ] Bundle audit
- [ ] Lighthouse pass on every State Console route
- [ ] axe-core sweep
- [ ] Screen-reader pass with TalkBack
- [ ] Dependency audit
- [ ] VibeSec scan
- [ ] Commit tagged `m18-complete`

## M19 — Release candidate

- [ ] Version-bump
- [ ] Changelog
- [ ] Maestro full suite green
- [ ] Playwright full suite green
- [ ] Visual regression baseline locked
- [ ] Deploy preview verified
- [ ] Commit tagged `m19-complete`