# Build state

**Last updated:** 2026-04-27 by `claude-code` (opus 4.7)
**Current milestone:** 1 — Skeleton & infra
**Status:** in_progress (1 gate left: docker compose end-to-end after Docker Desktop restart)

## What's done

- Repo initialized at `C:\Users\INEWTON\DigiWDC\` (branch `main`).
- Spec documents at `docs/spec/wdc-backend-prompt.md` and `docs/spec/wdc-continuity-addendum.md`.
- `.handoff/{STATE,CHECKLIST,CONVENTIONS,DECISIONS,SESSION-LOG,README}.md` filled.
- ADRs 001–005 logged.
- NestJS 10 skeleton with config (zod-validated), pino structured logs, request-id middleware, `@Sensitive()` decorator, Postgres pool + Drizzle ORM module, ioredis module, Terminus health module.
- Health endpoints: `/health/live` (returns 200 always), `/health/ready` (Postgres + Redis, Terminus-style 503 on fail).
- `docker-compose.yml` for postgres 16 (pgvector image), redis 7, minio + minio-init, on non-conflicting ports 5433/6380/9100/9101.
- `Dockerfile` — multi-stage, distroless `nodejs20-debian12:nonroot`, deps-only pruning stage.
- GitHub Actions CI: lint + typecheck + openapi:check, unit tests, dep audit, container build + Trivy scan, openapi breaking-change diff (PRs only).
- ARCHITECTURE.md (with Mermaid diagrams), THREATS.md (20 threats with mitigations), RUNBOOK.md (stubs for restore drill, NDPR right-to-erasure, key rotation), LOAD-TEST.md (targets only), README.md (5-command setup).
- `pnpm verify` GREEN: 9 tests passing, lint 0 warnings, typecheck clean, openapi:check ok.
- API smoke-tested: `node dist/main.js` boots cleanly, both health endpoints respond correctly, every request emits a JSON log line with `req.id` and the response carries a matching `x-request-id` header.

## What's in flight

- **The only outstanding M1 gate:** `docker compose up -d` for **postgres** and **minio**.
  - Redis is up and verified.
  - The pgvector + minio image pulls failed earlier with `lookup registry-1.docker.io: no such host` — a Docker Desktop DNS-resolver glitch.
  - User is restarting Docker Desktop. After it comes back up, run `docker compose up -d` and confirm all three are `healthy`. Then re-run `curl http://127.0.0.1:3100/health/ready` and confirm postgres reports `up`.

## Next concrete actions (resume here)

1. **After Docker Desktop restart**, clear leftover state from the partial pull:
   `docker compose down -v` (removes the orphan `wdc_postgres` container and its volume — earlier compose flagged it).
2. `docker compose up -d` — confirm `wdc_postgres`, `wdc_redis`, `wdc_minio` are all `Up (healthy)`. The `minio-init` one-shot service should also have run and created the `wdc-artefacts` bucket; verify with `docker compose logs minio-init` (look for `mb local/wdc-artefacts`).
3. Boot the API: `set -a; source .env.local; set +a; node dist/main.js` (or `pnpm dev`). Hit `http://127.0.0.1:3100/health/ready` — expect 200 with both postgres and redis `up`.
4. Tick the last two boxes in `.handoff/CHECKLIST.md` under M1.
5. Append a short note to `.handoff/SESSION-LOG.md` confirming the docker leg is green.
6. Tag the commit: `git tag -a m1-complete -m "M1 — Skeleton & infra"`.
7. Begin **M2 — Schema & RLS**:
   - Design the canonical schema for: `lgas`, `wards`, `users`, `forms`, `form_versions`, `reports`, `report_op_log` (append-only), `attachments`, `audit_events`, `delivery_attempts`, `investigations`, `investigation_evidence`, `messages`, `embeddings`. ~14 tables.
   - First migration `drizzle/0001_init.sql` creates tables.
   - Second migration `drizzle/0002_rls.sql` enables RLS and writes policies for `secretary` / `coordinator` / `director` / `system`.
   - Seed script `scripts/seed.ts` populates 23 LGAs and 255 ward stubs (use realistic Kaduna names; flag in ARCHITECTURE.md).
   - RLS denial integration tests via Testcontainers — every role × every table.
   - All under coverage gate ≥ 80% lines for services.
   - Commit per logical step; tag `m2-complete` when all gates green.

## Open questions / decisions deferred

- 23 LGAs + 255 ward names (M2 will stub; flagged in ARCHITECTURE §10).
- Production hosting target (Galaxy Backbone? Self-managed K8s? AWS af-south-1?) — relevant to M13.
- ASR provider for Hausa (self-hosted Whisper-large-v3 in dev assumed; prod TBD) — M8.

## Blockers

- None blocking — Docker Desktop restart unblocks the last M1 gate.

## Do not touch

- `.handoff/DECISIONS.md` is append-only — supersede ADRs, never edit them.
- `docs/spec/` is the original prompts; treat as immutable reference.
- Migrations under `drizzle/0001_*.sql` and later (when they exist) are immutable post-merge — fix bad migrations with new ones.
