# Architecture — WDC Frontend

## Stack Rationale

| Layer | Technology | Why |
|--------|-----------|-----|
| **Monorepo** | pnpm workspaces + Turborepo | Share code between 3 apps, fast CI |
| **Mobile** | Expo SDK 52 (RN 0.76) | Camera, audio, secure storage via Expo |
| **Web** | Next.js 14 App Router | Server components for read-heavy pages |
| **Design System** | Tokens-first, dual-target | Pixel-perfect consistency across RN + Web |
| **State** | TanStack Query (server) + Zustand (local) | Cache-first, optimistic updates |
| **Validation** | Zod | Runtime validation, generated from OpenAPI |
| **i18n** | react-intl + ICU | English + Hausa from day one |

## Directory Layout

```
apps/
  field-app/           # Expo / React Native
    app/               # expo-router file-tree
      (auth)/         # Login flow
      (secretary)/    # Secretary role routes
      (coordinator)/   # Coordinator role routes
    src/
  state-console/       # Next.js
    app/               # App Router
      (auth)/         # Login
      (dashboard)/    # Director dashboard
      reports/         # Submissions
      forms/           # Form builder
      users/           # User management
      investigations/  # Caseboard
      messages/        # Broadcast
      audit/          # Audit log
      ai/             # AI Assistant
      settings/       # Settings
    src/
packages/
  design-system/       # tokens.ts → Tailwind preset + RN theme
    src/
      tokens.ts        # Design tokens (canonical source)
      web/             # Tailwind + React components
      native/          # RN StyleSheet + View/Text wrappers
  api-client/          # openapi-typescript + TanStack Query wrapper
  domain/              # Zod schemas, report state machine
  i18n/                # en + ha MessageFormat bundles
```

## Navigation Graphs

### Field App (Secretaries + Coordinators)
- **Secretary**: `(auth) → (secretary) Dashboard → Snap → Wizard → Amira → Reports → Messages → Settings`
- **Coordinator**: `(auth) → (coordinator) Overview → Wards → Queue → Messages → Profile`

### State Console (Directors)
- **All routes**: Sidebar nav matches PDF: Overview, Submissions, Analytics, Form Builder, User Management, Investigations, Communications, Audit Log, AI Assistant

## Offline Strategy (Field App Only)

1. **Read**: TanStack Query persisted to MMKV (encrypted at rest)
2. **Write**: Mutation queue with UUIDv7 idempotency keys
3. **Draft**: Auto-save every field change to MMKV
4. **Sync**: On reconnect, replay mutations in order; backend dedupes

## Design Tokens (from walkthrough PDFs)

```typescript
colors: {
  forestGreen: '#1A7A4A',
  forestGreenDark: '#135A37',
  amber: '#E8730A',
  aubergine: '#3D1A5C',
  warmWhite: '#F9F7F4',
  charcoal: '#2B2B2B',
  // ... more tokens
}

typography: {
  display: 'Plus Jakarta Sans',
  ui: 'Inter',
  accent: 'Caveat',
}

spacing: [4, 6, 8, 10, 12, 14, 16, 20, 24, 32] // px
```

## Performance Budgets

| Metric | Target |
|--------|--------|
| Field App cold start | < 2.5s on Snapdragon 4xx, 2GB RAM, 3G |
| State Console FCP | < 1.5s cable, < 4s 3G |
| Field App JS bundle | < 1MB gzipped |
| State Console initial | < 250KB gzipped |
| Lighthouse score | ≥ 90 on all categories |

## Accessibility

- **Web**: Radix UI primitives, ARIA labels, keyboard navigation
- **Mobile**: accessibilityLabel, accessibilityRole, accessibilityState
- **Both**: WCAG 2.2 AA minimum

## Security

- **Mobile**: Tokens in expo-secure-store (Keychain / EncryptedSharedPreferences)
- **Web**: httpOnly + Secure + SameSite=Strict cookies
- **CSP**: `default-src 'self'` + report-only in dev
- **No secrets in bundle**: API keys server-side only

## Decisions Log

See `.handoff/DECISIONS.md` for architectural ADRs.

## Current Status

- **M1**: Monorepo skeleton (done)
- **M2+**: Design system, API client, apps to follow

Last updated: 2026-05-04