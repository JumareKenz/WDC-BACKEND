# WDC Backend — Kaduna State Digital Reporting Platform

Backend service for the **Kaduna State WDC Digital Reporting Platform**: 255 wards across 23 LGAs, three role tiers (Ward Secretary / LGA Coordinator / State Director), three submission paths (voice / OCR / typed) converging on one canonical report.

This repository is the system of record. Frontend (mobile + State Console) lives in a separate repository.

> **Continuity:** every coding agent starts by reading [`.handoff/STATE.md`](./.handoff/STATE.md). See [`docs/spec/wdc-continuity-addendum.md`](./docs/spec/wdc-continuity-addendum.md) for the resume protocol.

## Required tooling

| Tool                | Version       | Why                              | Install                                                              |
| ------------------- | ------------- | -------------------------------- | -------------------------------------------------------------------- |
| Node.js             | 20 LTS        | Runtime (per ADR-001)            | https://nodejs.org or `nvm install 20`                               |
| pnpm                | 10.x          | Package manager                  | `corepack enable && corepack prepare pnpm@10 --activate`             |
| Docker + Compose v2 | latest        | Local Postgres / Redis / MinIO   | https://docs.docker.com/get-docker/                                  |
| Git                 | ≥ 2.40        | Version control                  | https://git-scm.com                                                  |

CI pins Node 20 and pnpm 10 explicitly. Local dev on Node 22+ usually works but is not the canonical green check (see `.handoff/DECISIONS.md` ADR-001).

## Local setup (5 commands)

```bash
cp .env.example .env.local
docker compose up -d
pnpm install
pnpm openapi:check
pnpm dev
```

Verify:

```bash
curl -s http://127.0.0.1:3100/health/live | jq
curl -s http://127.0.0.1:3100/health/ready | jq
```

The API is then on `http://127.0.0.1:3100/api/v1`. Swagger UI at `http://127.0.0.1:3100/api/docs`.

> Use `127.0.0.1` rather than `localhost` on Windows — `localhost` resolves to IPv6 first and can hit other apps' listeners or take a flaky WSL relay path. See ADR-005.

## Ports (local dev)

| Service          | Port      | Notes                                                          |
| ---------------- | --------- | -------------------------------------------------------------- |
| API              | 3100      | NestJS app (3000 commonly taken by frontend dev servers)       |
| Postgres         | 5433      | Mapped from container :5432 (avoids host clash)                |
| Redis            | 6380      | Mapped from container :6379                                    |
| MinIO API        | 9100      | S3-compatible                                                  |
| MinIO Console    | 9101      | Web UI — `minioadmin` / `minioadmin`                           |

See `.handoff/DECISIONS.md` ADR-005 for why these ports differ from defaults.

## Scripts

| Command                 | What it does                                                       |
| ----------------------- | ------------------------------------------------------------------ |
| `pnpm dev`              | Start API in watch mode                                            |
| `pnpm build`            | Compile TypeScript to `dist/`                                      |
| `pnpm start`            | Run the compiled app                                               |
| `pnpm lint`             | ESLint with zero warnings allowed                                  |
| `pnpm typecheck`        | `tsc --noEmit`                                                     |
| `pnpm test`             | Vitest (unit)                                                      |
| `pnpm test:coverage`    | Vitest + v8 coverage                                               |
| `pnpm openapi:generate` | Boot Nest, dump spec to `openapi.generated.yaml`                   |
| `pnpm openapi:check`    | Validate committed `openapi.yaml`                                  |
| `pnpm drizzle:generate` | Generate migration from schema                                     |
| `pnpm drizzle:migrate`  | Apply pending migrations                                           |
| `pnpm verify`           | **The contract.** lint + typecheck + test + openapi:check.         |

`pnpm verify` is the single green-light gate. Don't merge or hand off red.

## Directory layout

```
.
├── ARCHITECTURE.md           # Stack rationale, module map, Mermaid diagrams, assumptions
├── THREATS.md                # Threat model (NDPR + ISO 27001-aligned)
├── RUNBOOK.md                # On-call procedures, restore drill, NDPR right-to-erasure
├── LOAD-TEST.md              # Capacity numbers from real k6 runs (filled in M14)
├── README.md                 # This file
├── docker-compose.yml        # Postgres + Redis + MinIO
├── Dockerfile                # Multi-stage, distroless, non-root
├── .github/workflows/        # CI: lint, typecheck, test, audit, scan, openapi diff
├── .handoff/                 # Continuity layer — read first when resuming work
├── docs/spec/                # Original prompts (immutable reference)
├── drizzle/                  # Numbered migrations (M2+); init scripts for first boot
├── src/
│   ├── modules/              # One folder per bounded context
│   ├── common/               # Guards, interceptors, decorators (incl. @Sensitive)
│   ├── infra/                # Postgres / Redis / S3 / queue / KMS clients
│   ├── config/               # Zod-validated config loader
│   └── main.ts
├── tests/
│   ├── unit/                 # Vitest unit tests
│   ├── integration/          # Testcontainers-backed (M2+)
│   ├── property/             # fast-check (M6+)
│   └── load/                 # k6 (M7+)
├── scripts/                  # OpenAPI generate/check, ops helpers
└── openapi.yaml              # Committed contract; CI diff-checks for breakage
```

## Current state

See [`.handoff/STATE.md`](./.handoff/STATE.md) and [`.handoff/CHECKLIST.md`](./.handoff/CHECKLIST.md). Resume protocol in [`docs/spec/wdc-continuity-addendum.md`](./docs/spec/wdc-continuity-addendum.md).
