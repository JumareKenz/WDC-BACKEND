# Build state

**Last updated:** 2026-04-27 by `claude-code` (opus 4.7)
**Current milestone:** 4 — Users & onboarding (M3 complete, tagged `m3-complete`)
**Status:** ready to start M4

## What's done

### M3 — Auth (this session)
- `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` + `argon2` + `otplib` deps
- RS256 dev JWT keypair via `pnpm gen:jwt-keys` → `secrets/jwt-{private,public}.pem` (gitignored). Production keys live in Vault per RUNBOOK §4.
- `ArgonService`: Argon2id (m=64MiB, t=3, p=1) with per-user salt + 32-char pepper from `ARGON2_PEPPER`. `verify` returns false on malformed encoded strings (no info leak).
- `TotpService`: otplib wrapper, ±1 step window, generate/enrol/verify. Secret stored in `users.totp_secret_ciphertext` encrypted via pgcrypto.
- `TokenService`: 15min access JWT + 7d refresh. Refresh stored hashed (sha256, no salt — token is 48 random bytes). Rotation marks old revoked, inserts new with `rotated_from_id`. **Reuse detection**: presenting an already-revoked refresh token revokes the entire device chain (in a separate committed txn — a throw inside `withRlsTransaction` rolls back, so the chain-kill must commit before the 401).
- `JwtAuthGuard` + `RolesGuard` registered as `APP_GUARD` (global). `@Public()` exempts health and auth-issuance endpoints.
- `AuditService.append()`: hash-chained insert with canonical JSON, sha256(prev_hash || canonical), GENESIS = 64 zeros for the first row. Always runs `role=system` so the `audit_events_insert_system_only` RLS policy permits it.
- `AuthService` paths: mobile (phone_hash lookup → argon verify → tokens), console (email_hash lookup → argon verify → TOTP verify → tokens, director-only). Both record success and failure events.
- `/auth/sign-in/{mobile,console}`, `/auth/refresh`, `/auth/sign-out`. Health endpoints marked `@Public()`.
- 26 new tests: 4 argon (round-trip, malformed, salt entropy, pepper isolation), 5 TOTP (secret format, fresh-token verify, malformed reject, wrong-token reject, enrolment URI), 4 token helpers (hash determinism, duration parsing, garbage rejection), 4 audit canonical-JSON (key sorting, array order, primitives, equality), 6 auth integration (sign-in OK, bad PIN, unknown phone, rotation+reuse-detection, missing bearer = 401, sign-out revokes).
- OpenAPI snapshot updated to 6 paths (4 auth + 2 health) including `TokenResponse` schema.

### M2 — Schema & RLS
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

Nothing — M3 is complete. M4 has not started.

## Next concrete actions (resume here)

Begin **M4 — Users & onboarding**:
1. `UsersService` + `UsersController` under `src/modules/users/`: CRUD for secretaries and coordinators; assign LGA / ward; suspend/reactivate; soft delete.
2. Director-only endpoints (gated by `@Roles('director')`); coordinator can read users in own LGA.
3. PII handling on input: phone normalised to E.164, hashed (sha256) for `phone_hash`, encrypted via `pgp_sym_encrypt` for `phone_ciphertext`. Same for email. Names stored only encrypted.
4. PIN/password setup: at user create, no hash is set — generate a one-time enrolment token (24h TTL) the user redeems at `POST /auth/set-credentials` to set their PIN (mobile) or password+TOTP (console).
5. Audit events on every write (`users.created`, `users.updated`, `users.suspended`, `users.deleted`, `users.assignment_changed`).
6. Integration tests: director can CRUD anyone, coordinator can read own LGA only, secretary cannot enumerate.
7. Commit per logical step; tag `m4-complete` when all gates green.

**Note for M4 author:** the DI explicit-`@Inject` pattern from M3 (every constructor parameter has `@Inject(Token)` even when type-emit "should" handle it) is now the project convention — see SESSION-LOG entry below for why. Match it in new modules.

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
