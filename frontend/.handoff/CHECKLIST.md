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
- [ ] Install dependencies (`pnpm install`)
- [ ] Verify `pnpm verify` passes
- [ ] Tag commit `m1-complete`

## M2 — Design system part 1: tokens & primitives

- [ ] Extract tokens from walkthrough PDFs (tokens.ts)
- [ ] Tailwind preset exposes every token as a class
- [ ] RN ThemeProvider exposes every token as `useTheme()`
- [ ] Button, Card, StatusPill, Phone, KpiTile components
- [ ] Typography components
- [ ] Each primitive has Storybook entry
- [ ] Each primitive has unit + a11y test
- [ ] Dark mode support
- [ ] Visual regression baseline captured