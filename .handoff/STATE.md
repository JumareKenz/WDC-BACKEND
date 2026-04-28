# Build state

**Last updated:** 2026-04-27 by `claude-code` (opus 4.7)
**Current milestone:** 3 — Auth (M2 complete, tagged `m2-complete`)
**Status:** ready to start M3

## What's done

### M2 — Schema & RLS (this session)
- 14 tables: `lgas`, `wards`, `users`, `refresh_tokens`, `forms`, `form_versions`, `reports`, `report_op_log`, `idempotency_keys`, `attachments`, `audit_events`, `messages`, `delivery_attempts`, `investigations`, `investigation_evidence`, `embeddings` (with `vector(1536)` for pgvector).
- Drizzle TS schemas under `src/infra/postgres/schema/*.ts` (one file per bounded context); custom `bytea` type in `_types.ts`.
- Three SQL migrations under `drizzle/`: `0001_init.sql` (tables + indexes + triggers — `updated_at`, `form_versions_immutable`, `audit_events_append_only`, `report_op_log_append_only`), `0002_rls.sql` (creates `wdc_app` role, `ENABLE` + `FORCE` RLS on every table, GUC accessor helpers `wdc_current_role()` / `wdc_current_user_id()` / `wdc_current_lga_id()` / `wdc_current_ward_id()`, role-scoped policies for secretary/coordinator/director/system), `0003_append_only_policies.sql` (UPDATE/DELETE policies for `system` on audit_events + report_op_log so the trigger is the canonical enforcement layer).
- Hand-rolled migration runner `scripts/migrate.ts` invoked via `pnpm drizzle:migrate` — required because drizzle-kit doesn't model RLS, custom triggers, or `pgvector`'s `vector` type.
- RLS context helper `src/common/rls/rls-context.ts` with `applyRlsContext()` and `withRlsTransaction()` — services in M3+ wrap every DB call in this.
- Seed script `scripts/seed.ts` populates 23 real Kaduna LGAs (with Hausa names) and 255 ward stubs (`<LGA-CODE>-W<NN>`); idempotent.
- 11 RLS integration tests in `tests/integration/rls.spec.ts` covering all role-scope axes; uses transaction-sandboxed savepoints so the dev DB is never polluted.
- ESLint allows `!` non-null in tests/scripts (fixture rows are known-existent).

### M1 — Skeleton & infra
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

Nothing — M2 is complete. M3 has not started.

## Next concrete actions (resume here)

Begin **M3 — Auth**:
1. Sign-in endpoints: `POST /api/v1/auth/sign-in/console` (email + password + TOTP for director) and `POST /api/v1/auth/sign-in/mobile` (phone + PIN for secretary/coordinator).
2. Refresh-token rotation: `POST /api/v1/auth/refresh` issues a new access JWT (15min, RS256) and rotates the refresh token (7d, hashed-at-rest in `refresh_tokens` table, device-bound for mobile, `rotated_from_id` chained for revocation cascade).
3. Argon2id PIN hashing with per-user salt + per-deployment pepper from secrets manager (`ARGON2_PEPPER` in `.env.example`).
4. TOTP enrollment + verification for `director` role (mandatory; secret stored encrypted in `users.totp_secret_ciphertext` keyed by `key_id`).
5. NestJS `@Roles()` decorator + `JwtAuthGuard` + `RolesGuard`. RLS context middleware reads JWT → calls `applyRlsContext` on every request.
6. Failed sign-ins, OTP timeouts, RLS denials all written to `audit_events` (system-role inserts via background queue or sync).
7. Tests: unit (token rotation logic, argon2 round-trip, TOTP window), integration (sign-in happy path + each failure mode, refresh rotation invalidates prior token).
8. Commit per logical step; tag `m3-complete` when all gates green.

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
