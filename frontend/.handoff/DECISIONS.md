# Architecture Decision Log

Append-only. To change a decision, add a new ADR that supersedes the old one. Do not edit accepted ADRs.

---

## ADR-001 — Monorepo setup: pnpm + Turborepo

**Date:** 2026-05-04
**Status:** accepted
**Context:** Need to share code between 3 apps (Field App, State Console, Storybook) and 5 packages.
**Decision:** pnpm workspaces + Turborepo for build orchestration.
**Consequences:** Fast CI via caching, simple `pnpm install`, shared lint/config.
**Rejected alternatives:** Lerna (unmaintained), npm workspaces (no caching), Yarn workspaces (slower).

---

## ADR-002 — Mobile: Expo SDK 52

**Date:** 2026-05-04
**Status:** accepted
**Context:** Field App needs camera, audio recording, secure storage.
**Decision:** Expo SDK 52 (React Native 0.76+) with expo-router for file-based routing.
**Consequences:** Fast development, managed workflow, easy builds via EAS.
**Rejected alternatives:** Bare React Native (more control but slower dev), Flutter (new framework).

---

## ADR-003 — Web: Next.js 14 App Router

**Date:** 2026-05-04
**Status:** accepted
**Context:** State Console needs server components for read-heavy pages.
**Decision:** Next.js 14 with App Router, server components for dashboard/tables.
**Consequences:** Great performance, but no SSR for authenticated user data (client-side render after auth).
**Rejected alternatives:** Remix (less mature), plain React (no SSR benefits).

---

## ADR-004 — State: TanStack Query + Zustand

**Date:** 2026-05-04
**Status:** accepted
**Context:** Need server state caching and local UI state.
**Decision:** TanStack Query v5 for server state, Zustand for local state.
**Consequences:** Cache-first approach, optimistic updates, no Redux boilerplate.
**Rejected alternatives:** Redux (too heavy), Jotai (less mature), SWR (TanStack is newer).

---

## ADR-005 — Validation: Zod

**Date:** 2026-05-04
**Status:** accepted
**Context:** Need runtime validation, especially for form schemas from backend.
**Decision:** Zod for all runtime validation, generate from OpenAPI.
**Consequences:** Type-safe validation, easy schema evolution.
**Rejected alternatives:** Yup (less TypeScript-native), io-ts (more complex).