# Conventions — WDC Frontend

## Token Usage

- **No hex literals outside tokens.ts** — ESLint rule enforces
- Adding a new token: add to `packages/design-system/src/tokens.ts`, update both web (Tailwind) and native (StyleSheet)

## Component Patterns

- **Primitives** in `packages/design-system/` — atomic components (Button, Card, StatusPill)
- **Compositions** in `apps/*/src/` — screen-level components
- Composition over props-explosion — if a component has >7 props, decompose

## State Management

- **Server state**: TanStack Query — caching, invalidation, refetch
- **Local state**: Zustand — UI state, form drafts, preferences
- Never use both for the same datum

## Form Rendering

- Always render from `FormVersion` schema returned by backend
- Never hand-roll form layouts — use `packages/domain/forms/`

## Offline Patterns (Field App)

- Mutation queue with UUIDv7 idempotency keys
- Draft autosave to MMKV every field change
- `useSyncStatus()` hook for queue depth + connectivity

## i18n Discipline

- No string literals in JSX — use `t('key')` from `packages/i18n`
- Both `en` and `ha` keys added in same commit
- ESLint rule enforces no bare strings

## Accessibility Checklist

- Every interactive element has `accessibilityLabel`, `accessibilityRole`, `accessibilityState`
- Web: Radix UI primitives, ARIA labels, keyboard navigation
- Screen-reader pass with TalkBack before each milestone

## Test Discipline

- TDD: failing test first
- Property tests for local state machine reducer
- Component tests with Testing Library

## Commits

- Conventional Commits: `feat(field-app): add dashboard`, `fix(design-system): button variant`
- One logical change per commit
- Tag milestone: `m1-complete`, `m2-complete`

## Storybook

- Story before screen
- Cover states: default, loading, error, empty
- Visual regression locked via Chromatic

## Performance

- Bundle size gates in CI
- React Profiler before merging list re-renders