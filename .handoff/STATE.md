# Build state

**Last updated:** 2026-04-27 by `claude-code` (opus 4.7)
**Current milestone:** 2 — Schema & RLS (M1 complete, tagged `m1-complete`)
**Status:** ready to start M2

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

Nothing — M1 is complete. M2 has not started.

## Next concrete actions (resume here)

Begin **M2 — Schema & RLS**:
1. Design the canonical schema for: `lgas`, `wards`, `users`, `forms`, `form_versions`, `reports`, `report_op_log` (append-only), `attachments`, `audit_events`, `delivery_attempts`, `investigations`, `investigation_evidence`, `messages`, `embeddings`. ~14 tables.
2. First migration `drizzle/0001_init.sql` creates tables.
3. Second migration `drizzle/0002_rls.sql` enables RLS and writes policies for `secretary` / `coordinator` / `director` / `system`. App sets `app.current_user_id`, `app.current_role`, `app.current_lga_id`, `app.current_ward_id` via `SET LOCAL` per request.
4. Seed script `scripts/seed.ts` populates 23 LGAs and 255 ward stubs (realistic Kaduna names; flag in ARCHITECTURE.md as "to be replaced by user-supplied CSV").
5. RLS denial integration tests via Testcontainers — every role × every table.
6. All under coverage gate ≥ 80% lines for services.
7. Commit per logical step; tag `m2-complete` when all gates green.

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
