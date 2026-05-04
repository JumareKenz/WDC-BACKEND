# Build state

**Last updated:** 2026-05-04 by `opencode` (kimi-k2p6)
**Current milestone:** 3 — Design system part 2
**Status:** complete

## What's done
- M1 Monorepo skeleton ✅
- M2 Design system part 1 (tokens & primitives) ✅
- M3 Design system part 2 (composite components) ✅
  - AppBar (web + native): title, back button, actions
  - TabBar (web + native): default, pills, underlined variants
  - Modal (web) + BottomSheet (native)
  - Sidebar (web): nav with badges, user chip
  - Toast (web + native): 4 variants
  - Skeleton (web + native): text/circular/rectangular
  - 8 tests passing

## What's in flight
- Nothing — M3 is complete

## Next concrete actions (resume here)
1. Move to M4 — i18n foundation
   - react-intl provider
   - en/ha bundles expanded
   - Locale switch component
   - ESLint rule banning untranslated string literals

## Open questions / decisions deferred
- None

## Blockers
- None

## Do not touch
- `packages/design-system/src/tokens.ts` — frozen until new tokens needed