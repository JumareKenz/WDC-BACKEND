# WDC Frontend — Kaduna State Digital Reporting Platform

Frontend for the WDC Digital Reporting Platform: 3 apps consuming a shared backend API.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

## Project Structure

```
frontend/
├── apps/
│   ├── field-app/          # Expo (React Native) — Secretary + Coordinator
│   ├── state-console/       # Next.js 14 — Director
│   └── storybook/          # Component explorer
├── packages/
│   ├── design-system/       # Tokens + primitives (RN + Web)
│   ├── api-client/         # Generated from backend OpenAPI
│   ├── domain/             # Zod schemas, validation, state machine
│   └── i18n/               # English + Hausa locales
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages/apps |
| `pnpm verify` | lint + typecheck + test |
| `pnpm api:gen` | Regenerate API client from OpenAPI |

## Requirements

- Node.js 20+
- pnpm 9+
- (Field App) Expo CLI
- (State Console) Next.js 14

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [WDC Frontend Prompt](./WDC%20Frontend%20-%20Claude%20Code%20Prompt.md)