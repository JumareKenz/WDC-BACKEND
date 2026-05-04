# Claude Code prompt: Build the WDC Kaduna State frontends

This prompt builds **three frontends** that consume the WDC backend:

1. **WDC Field App** — React Native / Expo, used by Ward Secretaries AND LGA Alliance Coordinators (one binary, role-aware navigation).
2. **WDC State Console** — Next.js desktop web app, used by State Alliance Directors.
3. **`@wdc/design-system`** — a shared package consumed by both, encoding the exact tokens, components, and screen patterns defined in the three walkthrough PDFs.

The walkthrough PDFs are the canonical visual spec. Every colour, every spacing, every component variant on every screen is binding. Do not redesign anything.

---

## Pre-flight: which skills to install

Run these in Claude Code before starting. After install, **read the relevant SKILL.md files in full** before writing any code.

```bash
# Anthropic's official skills repo (foundation: skill spec, file-creation patterns)
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills

# Alirezarezvani — engineering POWERFUL tier (we used these for the backend too)
/plugin marketplace add alirezarezvani/claude-skills
/plugin install engineering-skills@claude-code-skills
/plugin install engineering-advanced-skills@claude-code-skills
/plugin install product-skills@claude-code-skills

# wshobson — granular plugins per domain
/plugin marketplace add wshobson/agents
/plugin install frontend-development@claude-code-workflows
/plugin install mobile-development@claude-code-workflows
/plugin install comprehensive-review@claude-code-workflows
/plugin install agent-teams@claude-code-workflows
/plugin install code-review-ai@claude-code-workflows

# Superpowers — TDD discipline + plan-then-execute methodology
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# VibeSec — frontend security checks (XSS, CSP, OWASP-for-SPAs)
# If not in a marketplace, clone manually:
git clone https://github.com/BehiSecc/VibeSec-Skill ~/.claude/external-skills/vibesec
```

**Skills you must actually read before coding** (these encode the constraints that matter for this build):

- `frontend-design` (alirezarezvani) — the design conventions we used for the UI/UX walkthrough PDFs. Same conventions apply here.
- `accessibility-audit` (alirezarezvani) — WCAG 2.2 AA is a hard requirement.
- `frontend-developer` agent (wshobson) — React/RN patterns.
- `mobile-developer` agent (wshobson) — Expo/RN-specific guidance.
- `superpowers/brainstorming`, `superpowers/writing-plans`, `superpowers/test-driven-development`, `superpowers/subagent-driven-development` — workflow discipline.
- VibeSec frontend-security checks — CSP, secrets-in-bundle prevention, dependency vetting.

If your platform doesn't support these plugins (e.g. you're running this in Kimi or OpenCode), **read `.handoff/CONVENTIONS.md` instead** — this build distils the substance of each into the repo itself for portability.

---

## THE PROMPT

You are a senior frontend engineer with deep experience shipping React Native apps for low-bandwidth, intermittently-connected markets and React/Next.js dashboards for institutional/enterprise customers. You will build the three WDC frontends. This is a real Nigerian state government deployment serving 255 wards across 23 LGAs and three role tiers (Secretary, LGA Alliance Coordinator, State Alliance Director). No shortcuts, no `TODO`s, no swallowed errors, no shipping-friendly compromises that hide behind a feature flag.

### What you're handed

1. **Three walkthrough PDFs** — `WDC Mobile App - Walkthrough.pdf`, `WDC Coordinator - Walkthrough.pdf`, `WDC State Console - Walkthrough.pdf`. These define every screen, every colour, every interaction. The original `print.html` source for these PDFs (with the JSX screen components) will also be provided — extract design tokens and component patterns from there directly.
2. **The backend OpenAPI spec** at `<backend-repo>/openapi.yaml` — every endpoint you call must exist there; if you need an endpoint that doesn't exist, raise it in `.handoff/STATE.md` under "Open questions" rather than inventing it.
3. **The role hierarchy** — Secretary writes to one ward, Coordinator approves across one LGA, Director oversees the whole state. RBAC is enforced server-side via JWT claims; frontend mirrors this for navigation visibility but never as the security boundary.

### Mandatory pre-work (do this before writing any code)

1. Read each linked SKILL.md from the install list, in full.
2. **Open the three walkthrough PDFs and the original `print.html` source files**, and extract the canonical design tokens into `packages/design-system/src/tokens.ts`. The tokens you must lift verbatim:
   ```
   colors:    forestGreen #1A7A4A, forestGreenDark #135A37, forestGreenSoft #E6F2EC,
              amber #E8730A, amberSoft #FDEBD8,
              aubergine #3D1A5C, aubergineDark #2A1140, aubergineSoft #EEE7F5,
              warmWhite #F9F7F4, warmWhite2 #F3EFE9,
              charcoal #2B2B2B, charcoal2 #555550,
              sage #A8C5A0, sageMuted #8FA98B,
              softRed #C0392B, softRedSoft #F7E0DD,
              line #E8E3DB, lineStrong #D8D1C5,
              dark theme: dBg #17121D, dSurface #1F1827, dSurface2 #2A2132,
                          dLine #362C40, dText #F3EFE9, dTextDim #A89EB5
   typography: 'Plus Jakarta Sans' (display + headings), 'Inter' (UI + body),
               'Caveat' (rare handwritten accent)
   typescale:  11 / 12.5 / 15 / 18 / 22 / 28 / 42
   radius:     phone-bezel 44, phone-screen 34, card 12/16, chip 100 (pill)
   spacing:    base 4, common 8/12/14/16/18/24/32mm in print, but in app use
               4/6/8/10/12/14/16/20/24/32 px
   tap target: never less than 44px
   hit state:  10% tint overlay (never shadow)
   ```
3. Produce `ARCHITECTURE.md` covering: stack rationale, monorepo layout, design-system contract, navigation graphs per role, offline-sync strategy on the client, decisions log (with rejected alternatives), accessibility approach, performance budgets per app.
4. Set up the `.handoff/` directory **on day one** (see Continuity section below). All subsequent agents — Claude Code, Kimi, OpenCode, Aider, Cursor, a human in a terminal — must be able to resume from here.
5. Apply Superpowers `brainstorming` first if anything is ambiguous. Apply `writing-plans` before each milestone. Use `subagent-driven-development` for sub-tasks within a milestone.

### Non-negotiable architecture decisions

- **Monorepo:** **pnpm workspaces** + **Turborepo**. Three workspaces:
  ```
  apps/
    field-app/       # Expo (React Native) — Secretary + Coordinator
    state-console/   # Next.js 14 App Router — Director
  packages/
    design-system/   # Shared tokens, primitives, dual targets (RN + web)
    api-client/      # Generated TS client from backend openapi.yaml
    domain/          # Shared types, validation (Zod), report state machine
    i18n/            # English + Hausa locale bundles, ICU MessageFormat
    eslint-config/
    tsconfig/
  ```
- **Languages & frameworks:**
  - Mobile: **Expo SDK 51+ (React Native 0.74+)**, **expo-router** (file-based routing), **TypeScript strict**.
  - Web: **Next.js 14 App Router**, **TypeScript strict**, **Tailwind CSS** with the design-system tokens exposed as CSS variables and Tailwind theme.
  - Both: **React 18+**, **TanStack Query 5** for server state, **Zustand** for local app state (no Redux), **Zod** for runtime validation.
- **Design system as one source of truth:**
  - `packages/design-system/src/tokens.ts` — primitive tokens (colours, typography, radius, spacing, motion).
  - `packages/design-system/src/web/` — primitives compiled for web (Tailwind preset + headless React components using Radix UI for a11y).
  - `packages/design-system/src/native/` — primitives compiled for React Native (View/Text wrappers, themed StyleSheet).
  - **Identical visual output across both platforms.** A `Button primary` looks the same on the Secretary's Android phone and on the Director's desktop browser.
  - Every component has a Storybook entry in `apps/storybook/` — both web and RN stories.
- **API client:**
  - Generate from the backend's `openapi.yaml` using `openapi-typescript` + a thin TanStack-Query wrapper. Never hand-write request types.
  - **One regeneration command:** `pnpm api:gen`. Drift between client types and backend spec must fail CI.
- **Offline-first (mobile only):**
  - **TanStack Query persisted cache** in MMKV (encrypted at rest). All read endpoints cache by default.
  - **Mutation queue** for write endpoints (submit report, send message, approve, return). Each queued mutation carries a UUIDv7 idempotency key. On reconnection, mutations replay in order; the backend dedupes via the idempotency key.
  - The mobile app **never** loses a draft. Drafts persist locally in MMKV, keyed by `(user_id, form_version_id, draft_id)`. Auto-save every field change.
  - The "Offline · 2 reports queued" pill on the dashboard reads from a single hook `useSyncStatus()` that aggregates queue depth + connectivity + last-sync time.
- **Voice & OCR (mobile):**
  - Voice: **expo-av** to record, server-side ASR. UI must show real-time amplitude waveform during recording; spec is in the Amira walkthrough.
  - OCR: **expo-camera** with edge detection overlay (we draw it ourselves with Skia or Reanimated; no extra native modules), upload image to backend OCR endpoint, server returns extracted fields with per-field confidence scores. UI tints scanned fields amber and adds a ✦ tag — exact pattern from the PDF.
- **Auth:**
  - Mobile: 4-digit PIN (Secretary) or 6-digit PIN (Coordinator). Stored only as Argon2id hash on backend; we send plaintext over TLS, never store plaintext locally. Refresh tokens in **Keychain (iOS) / EncryptedSharedPreferences (Android)** via expo-secure-store.
  - Web: email + password + TOTP for the Director. Refresh token in **httpOnly + Secure + SameSite=Strict** cookie. Access token in memory only.
- **Internationalisation:** **react-intl** + ICU MessageFormat. English and Hausa from day one. The `useLocale()` hook returns the current locale; all hardcoded strings forbidden — ESLint rule enforces it. **No translation as an afterthought.** When adding any user-visible string, add both `en` and `ha` keys in the same commit.
- **Accessibility:** **WCAG 2.2 AA minimum.** Concretely:
  - Web: Radix UI primitives where applicable, ARIA labels, focus management, reduced-motion support.
  - Mobile: `accessibilityLabel`, `accessibilityRole`, `accessibilityState` on every interactive element. Screen-reader pass with TalkBack (Android) before any milestone is "done".
  - Run `accessibility-audit` skill against each milestone's screens.
- **Performance budgets:**
  - Field App cold start to interactive: **< 2.5s on a low-end Android (Snapdragon 4xx, 2GB RAM, 3G)**.
  - State Console first contentful paint: **< 1.5s on cable**, **< 4s on simulated 3G**.
  - JS bundle: Field App < 1MB gzipped, State Console < 250KB initial route.
  - Lighthouse score: ≥ 90 on Performance, Accessibility, Best Practices, SEO for the State Console.
- **Observability:**
  - Both apps: structured client logs to backend `/api/v1/telemetry` endpoint, sampled.
  - **Sentry** for crash reporting (or self-hosted GlitchTip if data residency requires).
  - User-facing errors get a **support reference ID** matching backend's `request_id`.

### Core domain rules (these are not optional)

**Three apps, one design system, exact visual fidelity.**

- The mobile screens shipped must match the walkthrough PDFs pixel-for-pixel at the design canvas size. Reference frames: phone 380×800 logical, desktop 1440×900 logical.
- Colours, type scale, radius, spacing — all from `tokens.ts`. Hardcoded `#hex` literals outside `tokens.ts` are forbidden; ESLint rule enforces.
- Status pill component is one source: `<StatusPill kind="review|approved|flagged|missing|queued|submitted" />`. Every list — secretary's reports, coordinator's queue, director's submissions table — uses the same pill.
- Phone frame mock (StatusBar + GestureBar wrapper) lives in `design-system/native/Phone.tsx`. Reused across the app for the actual chrome.

**Field App role-aware navigation:**

- One binary, two role trees. After login, `useUser()` returns `role ∈ {secretary, coordinator}`. The router (expo-router) reads role and mounts:
  - `(secretary)/...` — Dashboard, Snap, Wizard, Amira, My Reports, Messages, Settings.
  - `(coordinator)/...` — Overview, Wards, Reports queue, Messages, Profile.
- A Director who somehow installs the field app gets a "Use the State Console on desktop" wall — they don't have a phone tree.
- Routes are server-protected anyway (JWT claims); the navigation guard is a UX nicety.

**State Console (desktop web):**

- Next.js App Router with server components for the read-heavy pages (Submissions table, LGA detail, Investigations list). Client components for the interactive pieces (Form Builder editor, AI Assistant, broadcast composer).
- **No SSR for authenticated pages's user-specific content** — render on client after auth bootstrap. SSR only for the public marketing/login shell. (We don't want directors' data hitting any edge cache.)
- Sidebar navigation matches the PDF exactly: Overview, Submissions, Analytics, Form Builder, User Management, Investigations, Communications, Audit Log, AI Assistant. Cycle pill near the top of sidebar; user chip docked at the bottom.

**Reports state machine on the client mirrors the backend:**

- `draft → submitted → in_review → (approved | returned) → sealed`.
- Each transition is one mutation. Optimistic update on success-path; rollback on failure with a toast.
- Property tests for the local state reducer prove that any sequence of operations applied locally converges to the same canonical state as the server's append-only log.

**Forms rendered from `FormVersion` JSON:**

- The Wizard screen, the Snap "review extracted" screen, and the Coordinator's review screen all render from the same `FormVersion` schema returned by the backend. **Never hand-write a form layout.** A form-renderer in `packages/domain/forms/` consumes the schema and emits the right components.
- Field types supported: text-short, text-long, number, stepper, date, single-choice, multi-choice, photo, voice-note, section, calculated, conditional. Mirror what the backend Form Builder produces.
- Each rendered field carries its current source (`typed | voiced | scanned`) and confidence (when scanned/voiced). Display per-field confidence in the Coordinator's review screen.

**AI Assistant (State Console only):**

- Single client component `<AIAssistant>` driven by a `useAI()` hook that calls `POST /ai/ask`.
- Renders prose + structured-data tables + recommendation cards + action buttons (e.g. "Open Kagarko investigation"). Cited sources rendered as `<Source>` chips beneath each claim.
- Composer supports keyboard shortcut `⌘K` to focus from anywhere. Streaming responses if the backend supports SSE; otherwise show a loading state with a known-vague phrase ("Looking into the data…") and never invent details.

**Voice & multilingual UX:**

- Amira flow plays back her question in audio (server returns audio URL from TTS) AND shows the transcript. User answers by holding the mic button (push-to-talk) — never auto-listen by default.
- Hausa toggle visible everywhere. Sticky preference persisted via SecureStore.
- Voice prompts in Hausa use the same text from the walkthrough ("Yaushe aka yi taron unguwarka a watan nan?"), provided by the backend TTS service in the user's locale.

### Performance & resilience targets (these gate "done")

- p95 screen transition < 200ms after data is cached. p95 cold-cache list render < 800ms on the low-end Android target.
- All long-running operations show progress (skeletons, never spinners — exception: 8s+ ASR upload, where a determinate progress bar is acceptable).
- Network errors never produce a white screen. Retry button + cached-data fallback + clear "you're offline" banner.
- The mobile app is operable for **90 minutes of continuous use without backend connectivity**, then syncs cleanly when online.
- Bundle size enforced in CI via `bundlesize` config; PR blocked if it grows by more than 5% without justification in the PR body.

### Security posture (frontend-specific; complements the backend's posture)

- **No secrets in the bundle.** API base URL and feature flags only. Anthropic API keys, Sentry DSNs that include write capability, Twilio etc. — server-side only. CI step scans the built bundle for known secret patterns; PR blocked on hits.
- **Content Security Policy** on the State Console: `default-src 'self'`, `connect-src 'self' <backend>`, `img-src 'self' data: <s3-bucket>`, no `unsafe-inline`, no `unsafe-eval`. CSP report-only mode in dev, enforced in prod.
- **Subresource Integrity** on every external script (we shouldn't have any, but if we do).
- **Dependency vetting:** every `pnpm add` requires a justification entry in `DECISIONS.md` (see continuity section). `pnpm audit` and `dependency-auditor` skill run in CI.
- **Token storage:** mobile in expo-secure-store, web in httpOnly cookies. Never localStorage for credentials.
- **PII discipline:** the same `@Sensitive()` discipline as the backend — fields tagged in code, redacted from logs sent to telemetry.
- VibeSec frontend security skill runs on the State Console at every milestone.

### Testing requirements

- **Unit tests** with **Vitest** (web) and **Jest** (RN). ≥ 80% line coverage for `packages/` and `apps/*/src/lib`.
- **Component tests** with **Testing Library** (both web and RN). Every primitive in `design-system/` has tests for: renders, a11y label, dark mode, disabled state, RTL safety (LTR-only locales for now, but no fixed LTR-assumptions in code).
- **Visual regression** with **Playwright + percy** (or Chromatic) for the State Console; **Storybook + react-native-storybook-screenshots** for the Field App. The walkthrough PDFs serve as the visual ground truth — initial snapshots taken from those.
- **E2E:**
  - Web: **Playwright** — `auth flow`, `submissions filter + drilldown`, `form builder edit + deploy`, `assign secretary`, `open investigation`, `AI Assistant query with citation`, `audit log export`. Run against a containerised backend in CI.
  - Mobile: **Maestro** flows — `pin login`, `amira conversation submit`, `wizard happy path`, `snap → review → submit`, `offline submission with later sync`, `coordinator approves`, `coordinator returns with comments`. Run on Android emulator in CI.
- **Property tests** for the local report state-machine reducer — fast-check + 1000 generated cases prove convergence with the backend's canonical state.
- **Accessibility tests:** axe-core integrated into Playwright runs; mobile a11y validated with the screen-reader pass before each milestone closes.
- **Performance tests:** Lighthouse CI in PR for the State Console (budget enforced). React Native Performance Profile for the Field App on each release candidate (cold start, JS thread time, frame drops).

### Deliverables (this is what "done" means)

```
wdc-frontend/
├── ARCHITECTURE.md
├── DECISIONS.md
├── README.md                  # Local-dev setup in <5 commands
├── .handoff/                  # Continuity contract, see below
├── package.json               # pnpm workspace root
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   ├── field-app/             # Expo / React Native
│   │   ├── app/               # expo-router file-tree
│   │   │   ├── (auth)/
│   │   │   ├── (secretary)/
│   │   │   └── (coordinator)/
│   │   ├── src/
│   │   ├── e2e/               # Maestro flows
│   │   └── tests/
│   ├── state-console/         # Next.js
│   │   ├── app/               # Next.js App Router
│   │   ├── src/
│   │   ├── e2e/               # Playwright specs
│   │   └── tests/
│   └── storybook/             # Combined web + RN stories
├── packages/
│   ├── design-system/
│   │   ├── src/tokens.ts
│   │   ├── src/web/           # Tailwind preset, web React primitives
│   │   ├── src/native/        # RN primitives
│   │   └── stories/
│   ├── api-client/
│   ├── domain/
│   ├── i18n/                  # en + ha bundles
│   ├── eslint-config/
│   └── tsconfig/
├── .github/workflows/         # CI: lint, typecheck, test, e2e, lighthouse, bundle-size
└── tools/
    └── extract-tokens.ts      # Reads the print.html source and validates tokens.ts
```

### Milestone sequence (incremental, commit per milestone)

Build incrementally. After each milestone, **the full `pnpm verify` must pass** and you must update `.handoff/STATE.md` and `.handoff/SESSION-LOG.md` before stopping. Apply `superpowers/test-driven-development` discipline throughout — write the failing test first.

1. **Monorepo skeleton & tooling** — pnpm + Turborepo + TS strict + ESLint + Prettier + commitlint + Husky + GitHub Actions skeleton + Storybook scaffold. `pnpm verify` runs and exits 0 with no real code.
2. **Design system part 1: tokens & primitives** — `tokens.ts` (lifted exactly from the walkthrough source), Tailwind preset, RN theme provider, `<Button>`, `<Card>`, `<StatusPill>`, `<Phone>` frame, `<KpiTile>`, typography components. Every primitive has Storybook + tests + dark mode. Visual snapshot established.
3. **Design system part 2: composite components** — `<AppBar>`, `<TabBar>`, sidebar nav, modal/bottom-sheet, form-field components (text, stepper, date, photo, voice-note placeholders), `<Toast>`, `<Skeleton>`. Both targets.
4. **i18n foundation** — react-intl provider, en/ha bundles, locale switch, ESLint rule that bans untranslated string literals. Hausa font verified for legibility on Android.
5. **API client & domain** — generate from `openapi.yaml`, write Zod schemas, write the report state-machine reducer with property tests, set up TanStack Query providers per app.
6. **Field App: auth + secretary onboarding** — splash, 3-slide carousel, LGA → Ward → PIN flow. Routes server-protected. Offline-first cache wired. Maestro flow `pin-login` passes.
7. **Field App: secretary core flows** — Dashboard variants, My Reports, Report Detail, Messages, Alerts, Settings. All consuming live backend or a mocked API in CI.
8. **Field App: Wizard form** — render from `FormVersion` schema, draft autosave, offline-queue submission, "review extracted" pattern. Maestro flow `wizard-happy-path` passes.
9. **Field App: Amira (voice) flow** — record, upload, transcript display, listening state with waveform, offline mode banner. Maestro flow `amira-submit` passes.
10. **Field App: Snap (OCR) flow** — camera with edge-detection overlay, OCR processing UI, review with per-field confidence, view-original modal. Maestro flow `snap-submit` passes.
11. **Field App: coordinator role tree** — Overview, Wards list + detail, Reports queue, Report review (with section-level comment composer), Approve / Return modals, Send Reminder bulk composer, Messages, Profile.
12. **State Console part 1: shell + auth + dashboard** — sidebar, top bar, Strategic Dashboard with KPIs + 23-LGA heatmap + AI Insights panel + needs-attention list. Lighthouse ≥ 90.
13. **State Console part 2: data tables** — Submissions queue (statewide, filterable), Investigations caseboard, User Management LGA tree.
14. **State Console part 3: detail views & modals** — LGA drilldown, Report review, Investigation detail with activity timeline, Assign Secretary modal.
15. **State Console part 4: Form Builder** — list view, three-pane editor (palette / canvas / properties), Hausa labels as first-class field property. Drag-and-drop with `dnd-kit`. Live preview matches what the field app will render.
16. **State Console part 5: Communications + Audit Log + Analytics + Settings** — broadcast composer with mobile preview, audit log table with sealed-CSV export, analytics charts (stacked area for submission velocity, sector mix, leaderboard, distribution histogram), settings sub-nav.
17. **State Console part 6: AI Assistant** — full conversation surface, capabilities panel, recent prompts, citations rendering, action buttons that route to the right screen.
18. **Hardening + perf + a11y pass** — bundle audit, Lighthouse pass on every State Console route, axe-core sweep, screen-reader pass with TalkBack on each Field App screen, dependency audit, VibeSec scan.
19. **Release candidate** — version-bump, changelog, Maestro full suite green, Playwright full suite green, visual regression baseline locked, deploy preview verified.

### Rules of engagement

- **The walkthrough PDFs are binding.** If a screen looks different in your implementation, the implementation is wrong, not the design. If a design choice in the PDF seems wrong to you, raise it in `.handoff/STATE.md` under "Open questions" with a screenshot — do not silently change it.
- **No new dependency without justification in `DECISIONS.md`.** Default to standard library; default to existing tooling; prefer composition over libraries.
- **No `any`. No `// @ts-ignore`. No `eslint-disable` without an inline reason and a file/line reference.**
- **Every screen in the PDF gets a Storybook entry before it gets built.** Storybook is the single source of truth for "this matches the design".
- **When you finish a milestone:** run `pnpm verify`; update `.handoff/STATE.md`; append to `.handoff/SESSION-LOG.md`; tag the commit `m<n>-complete`; only then propose the next milestone.

Begin with milestone 1. Confirm the stack first by listing your `package.json` workspace plan, then start the skeleton.

---

## CONTINUITY ADDENDUM (mandatory — applies the same as the backend)

This project must be agent-portable. Any agent (Claude Code, Kimi, OpenCode, Aider, Cursor, a human) must be able to look at the repository alone and resume with zero context loss.

### Hard rules

1. **The repo is the source of truth, not your conversation.** If a fact only lives in your chat memory, it does not exist. Persist it before stopping.
2. **No tool-specific files in source control.** Add `.claude/`, `.cursor/`, `.aider*`, `.kimi/`, `.opencode/` to `.gitignore`. The build must be reproducible by an agent that has never heard of any of these tools.
3. **Treat the install commands above as platform suggestions, not requirements.** The *content* of those skills must be summarised into `.handoff/CONVENTIONS.md` so future agents on platforms without those plugins get the same guidance.
4. **Every external command you assume must be documented in `README.md` under "Required tooling"** — exact versions, install command, why it's needed.

### `.handoff/` files (create in milestone 1, maintain religiously)

#### `.handoff/STATE.md`
Updated **every session before stopping**. Format:
```markdown
# Build state
**Last updated:** 2026-04-27 14:32 UTC by `claude-code` (session id: <opaque>)
**Current milestone:** 7 — Field App secretary core flows
**Status:** in_progress

## What's done
- M1 Skeleton & tooling ✅ (commit a3f2c91)
- M2 Design system part 1 ✅ (commit 8d4e1b2)
- M3 Design system part 2 ✅ (commit 1c5a907)
- M4 i18n ✅ (commit 4f8b2d3)
- M5 API client & domain ✅ (commit 7e9c0a4)
- M6 Auth + secretary onboarding ✅ (commit 9b3d1e2)

## What's in flight
- M7 Secretary core flows (this milestone)
  - Dashboard Variant A ✅, Variant B ✅, Dark mode ✅
  - My Reports list ✅
  - Report Detail — STARTED, header card + meeting section done.
    NOT YET: coordinator-comment thread, voice-note playback.
  - Messages — NOT STARTED
  - Alerts — NOT STARTED
  - Settings — NOT STARTED

## Next concrete actions (resume here)
1. Finish `apps/field-app/src/screens/ReportDetail/CommentThread.tsx`. Use
   the existing pattern from MessageThread for receipt rendering.
2. Wire voice-note playback via expo-av; reuse `useAudioPlayer` hook from
   `packages/design-system/src/native/hooks`.
3. Storybook story for ReportDetail must include 3 states: clean,
   coordinator-comments, returned-with-flags.
4. Maestro flow `report-detail-view` must pass.
5. Update STATE.md, commit `feat(field-app): complete report detail`.

## Open questions / decisions deferred
- (Q) Should `sealed` reports allow secretaries to download a PDF copy?
  Backend supports it but not in scope for M7. Documenting in DECISIONS.md
  for M19 follow-up.

## Blockers
- None.

## Do not touch
- `packages/design-system/` — frozen at M3 unless a new ADR justifies a change.
- `packages/api-client/` — regenerated only via `pnpm api:gen`, never hand-edited.
```

#### `.handoff/CHECKLIST.md`
Pass/fail gates per milestone. First unchecked = where the next agent starts. Run `pnpm verify` to validate.

```markdown
## M2 — Design system part 1
- [x] tokens.ts lifted from walkthrough source; values match this prompt's spec
- [x] Tailwind preset exposes every token as a class
- [x] RN ThemeProvider exposes every token as `useTheme()`
- [x] Button, Card, StatusPill, Phone, KpiTile, typography components
- [x] Each primitive has Storybook entry (web + RN)
- [x] Each primitive has unit + a11y test
- [x] Dark mode renders correctly across all primitives
- [x] Visual regression baseline captured
- [x] Commit tagged m2-complete

## M7 — Field App secretary core (in progress)
- [x] Dashboard Variant A
- [x] Dashboard Variant B
- [x] Dashboard dark mode
- [x] My Reports list
- [ ] Report Detail (in flight — see STATE.md)
- [ ] Messages (chat list + thread)
- [ ] Alerts (grouped notifications)
- [ ] Settings (language toggle persistence verified)
- [ ] All screens have Storybook entries
- [ ] axe-core report shows zero critical violations
- [ ] Maestro flow `secretary-core-loop` passes
- [ ] Commit tagged m7-complete
```

#### `.handoff/CONVENTIONS.md`
The frontend conventions distilled into platform-agnostic prose, so an agent without the skill plugins can still follow them. Sections:

- Token usage (no hex literals outside tokens.ts; how to add a new token)
- Component patterns (composition over props-explosion; primitives in design-system, compositions in apps)
- State management (TanStack Query for server state; Zustand for local app state; never both for the same datum)
- Form rendering (always from FormVersion schema; never hand-rolled)
- Offline patterns (mutation queue; idempotency keys; draft autosave)
- i18n discipline (no string literals in JSX; both en and ha keys in the same commit)
- Accessibility checklist (a11y label, role, state, keyboard, screen-reader)
- Test discipline (TDD; failing test first; property tests for state machines)
- Commits (Conventional Commits; one logical change per commit; milestone tags)
- Storybook discipline (story before screen; states covered; visual regression locked)
- Performance (bundle gates; React profiler before merging anything that re-renders a list)

#### `.handoff/DECISIONS.md`
Append-only ADR log. New ADRs supersede old ones — old ones are never edited.

```markdown
## ADR-014 — Expo (managed) over bare React Native
**Date:** 2026-04-27
**Status:** accepted
**Context:** Mobile app needs camera, voice recording, secure storage,
push notifications. Bare RN is more flexible but the team is small.
**Decision:** Expo SDK 51 managed workflow. EAS Build for binaries.
expo-camera, expo-av, expo-secure-store cover all native needs.
**Consequences:** Fast development; fewer native bugs; one ejection
moment if we need a native module Expo doesn't support (none planned).
**Rejected alternatives:** Bare RN (more native control but slower dev);
Flutter (would invalidate the design-system + RN expertise).
**Author:** claude-code (session 2026-04-27)
```

Every architectural choice goes here. No exceptions.

#### `.handoff/SESSION-LOG.md`
Append-only. Each session writes one entry when it stops.

```markdown
## 2026-04-27 14:32 UTC — claude-code
**Worked on:** M7 secretary core flows
**Commits:** a3f2c91, 8d4e1b2, 1c5a907
**Tests:** 412 passing, 0 failing, web coverage 84.2%, RN coverage 81.7%
**Storybook:** 67 stories, all snapshots clean
**Stopped because:** session token limit
**Notes for next agent:**
- expo-router quirk: dynamic routes need explicit `router.replace` after
  PIN entry, not `router.push` — see commit 1c5a907 for the fix.
- The Variant B dashboard's heatmap is heavy; memoise the row renderer
  before adding the dark-mode variant or you'll regress scroll perf.
```

### Resume protocol — what every new agent does first

When you (any agent) start work on this repo, before writing any code:

1. Read `.handoff/STATE.md` — current milestone, what's in flight.
2. Read `.handoff/CHECKLIST.md` — find the first unchecked box; that's your start line.
3. Read the last 3 entries of `.handoff/SESSION-LOG.md` — gotchas to know.
4. Run `git log --oneline -20` to confirm STATE.md matches reality.
5. Run `pnpm install && pnpm verify` — if red, your first job is to make it green. Never start new work on a red build.
6. Read `.handoff/CONVENTIONS.md` and `.handoff/DECISIONS.md` — accumulated wisdom.
7. **Open the three walkthrough PDFs.** They are the visual spec. If you're a new agent and you haven't seen them, you cannot proceed.
8. Only now start coding the next unchecked checklist item.

### Stop protocol — before your final message in any session

1. Commit anything uncommitted. Never leave staged-but-uncommitted work.
2. Update `.handoff/STATE.md` — write "next concrete actions" as if for a stranger.
3. Append an entry to `.handoff/SESSION-LOG.md`.
4. Run `pnpm verify` one last time. If red, **roll back to the last green state and document the failed attempt in SESSION-LOG.md**. Never hand over a broken build.
5. Push to remote.

### `pnpm verify` — the single command that defines green

```json
{
  "scripts": {
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm storybook:test"
  }
}
```

If `pnpm verify` exits 0, the codebase is handoff-able. If non-zero, work is not done.

### Tool-specific notes

- **Claude Code:** the install commands above work as-is.
- **Kimi (Moonshot Coder):** no plugin system. Open `.handoff/CONVENTIONS.md` first; it carries the substance. Then follow the resume protocol.
- **OpenCode:** `.handoff/STATE.md` is your task brief. OpenCode tends to want to re-architect — resist. `.handoff/DECISIONS.md` is binding; new ADRs supersede old, they don't silently override.
- **Aider:** `aider .handoff/STATE.md .handoff/CHECKLIST.md` to load context first.
- **Cursor / Windsurf:** generate platform-specific shadow copies of conventions on demand (`./tools/export-conventions.sh cursor`) but do not commit them — they're derived.

### What this is NOT

- Not a workflow tool. Plain markdown an agent reads in seconds.
- Not a postmortem record — that lives in `RUNBOOK.md`.
- Not a substitute for good commits. If `STATE.md` says "see commits", that's a STATE.md failure.

The continuity layer is six markdown files, one npm script, one CI gate. The discipline of maintaining them is what makes the build resumable.

---

## What you (the human) should hand Claude Code with this prompt

1. The three walkthrough PDFs.
2. The original `print.html` + `screens/*.jsx` source files (for clean token extraction — don't have the agent guess from rasterised PDFs alone).
3. The backend repo (or just its `openapi.yaml`) — frontend cannot be built without the API contract.
4. Production constraints if known: target Android API levels, hosting target for the State Console (Vercel, self-hosted, Galaxy Backbone), CDN strategy.
5. Brand assets: WDC logomark, Kaduna State crest at any source-quality version (we used SVG inline previously; replace with whatever you have).

If any of these are unknown, the agent should stub realistic values and call them out in `.handoff/STATE.md` under "Open questions to confirm".
