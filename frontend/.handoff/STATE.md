# Build state

**Last updated:** 2026-05-04 by `opencode` (kimi-k2p6)
**Current milestone:** 4 — i18n foundation
**Status:** complete

## What's done
- M1 Monorepo skeleton ✅
- M2 Design system part 1 (tokens & primitives) ✅
- M3 Design system part 2 (composite components) ✅
- M4 i18n foundation ✅
  - react-intl provider with LocaleContext
  - Expanded en/ha locale bundles (40+ keys each, fully matching)
  - useLocale and useFormatMessage hooks
  - LocaleSwitch component (web + native)
  - ESLint custom rule: no-untranslated-jsx-text
  - 8 tests passing

## What's in flight
- Nothing — M4 is complete

## Next concrete actions (resume here)
1. Move to M5 — API client & domain
   - Generate from backend openapi.yaml
   - Zod schemas for runtime validation
   - Report state-machine reducer
   - Property tests for reducer
   - TanStack Query providers per app

## Open questions / decisions deferred
- None

## Blockers
- None

## Do not touch
- `packages/design-system/src/tokens.ts` — frozen until new tokens needed
- `packages/i18n/src/locales/en.ts` and `ha.ts` — always add both keys in same commit