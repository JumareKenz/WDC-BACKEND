# Build state

**Last updated:** 2026-04-27 by `claude-code` (opus 4.7)
**Current milestone:** 6 — Reports core (M5 complete, tagged `m5-complete`)
**Status:** ready to start M6

## What's done

### M5 — Forms & versioning (this session)
- `src/modules/forms/form-schema.ts`: Zod discriminated union over 7 field types (text, number, date, select, checkbox, photo, audio). Hausa label (`label_ha`) is mandatory on every field and every option. `superRefine` enforces section-key + field-key uniqueness.
- `FormsService`: create / list / getById / update / createVersion / listVersions / getVersion / deploy / archive / listVisible. All director-write, RLS-read. `validateScope()` rejects mismatched `scope_kind` + `scope_ids` pairs.
- Deploy flow: marks the *latest* version `deployed_at` + `deployed_by`, sets `forms.current_version_id` and `forms.status='deployed'`. The 0001 trigger `wdc_form_versions_immutable` then blocks any UPDATE/DELETE on that version row.
- `GET /forms/visible`: SQL filter `scope_kind='state' OR (scope_kind='lga' AND scope_ids ? $lga::text) OR (scope_kind='ward' AND scope_ids ? $ward::text)`. Only `deployed` forms appear.
- 9 endpoints under `/api/v1/forms`. OpenAPI: 19 paths total.
- Tests +13: 7 form-schema unit (valid minimal, unknown type, missing label_ha, dup field/section keys, select with options, snake_case field key); 6 forms integration (director CRUD + coordinator-403, invalid schema 400, deploy freezes + DB UPDATE rejected by trigger, no-version 400 + double-deploy 409, visible scope filter, archive lifecycle).

### M4 — Users & onboarding
- Migration `0004_enrolment_tokens.sql`: `users.enrolment_token_hash` (bytea, sha256) + `users.enrolment_expires_at` (24h TTL). Partial unique index (where not null).
- `withRlsTransaction` extended to set `LOCAL ROLE wdc_app` and `LOCAL app.dek` at the start of every wrapped txn — production code now engages RLS automatically and pgcrypto column functions can decrypt.
- `src/common/crypto/phone.ts`: E.164 normalisation (also upgrades Nigerian `0…` → `+234…`), deterministic phone/email hashes for index lookups.
- `src/common/crypto/pgcrypto.ts`: thin `pgp_sym_encrypt` / `pgp_sym_decrypt` wrappers reading the session-level `app.dek`.
- `UsersService` + `UsersController` + `UsersModule`: create / list (cursor-paginated, RLS-scoped) / get / patch assignment / suspend / reactivate / soft-delete. Writes are `@Roles('director')`. Phone uniqueness collision returns 409.
- `POST /auth/set-credentials`: redeems a one-time enrolment token; mobile users set PIN, console users set password + TOTP secret + a TOTP proof. Token is invalidated on redemption (re-presenting returns 401).
- Audit hooks on every write: `users.created`, `users.assignment_changed`, `users.suspended`, `users.reactivated`, `users.deleted`, `auth.enrolment.completed`.
- OpenAPI: 12 paths (4 auth + 6 users + 2 health) with `User`, `CreateUser`, `CreateUserResponse` schemas.
- Test count 46 → 60 (4 phone-helper unit, 2 cursor unit, 6 users integration covering director CRUD, coordinator-403, RLS scope, phone collision, enrolment redeem + reuse-401).

### M3 — Auth
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

Nothing — M5 is complete. M6 has not started.

## Next concrete actions (resume here)

Begin **M6 — Reports core**:
1. `ReportsService` + `ReportsController` under `src/modules/reports/`: create draft against a deployed `form_version_id` (secretary, own ward), submit (`POST /:id/submit`), open review (`POST /:id/open-review` — coordinator), approve (`POST /:id/approve`), return (`POST /:id/return` with notes), seal (background job after `REPORT_SEAL_GRACE_DAYS`, default 7).
2. **State machine** `draft → submitted → in_review → (approved | returned) → sealed`. Returned reports go back to draft when secretary edits. Once sealed, content is immutable (the trigger on `report_op_log` already blocks tampering; a similar `reports.canonical` immutability check goes in M6).
3. **Append-only history**: every state change and field edit is an op in `report_op_log` with `op_kind` ∈ `{field_set, attachment_add, submit, open_review, approve, return, seal}`. The `reports.canonical` JSONB is a derived projection over the op log, recomputed on every accept.
4. **Per-field `source` + `confidence`**: each `field_set` op carries `{ source: 'typed' | 'voiced' | 'scanned', confidence: number | null }`. The canonical projection retains the most recent value per field key.
5. Property test (`tests/property/report-history.spec.ts`): same operations applied in any order yield the same canonical state. Use `fast-check` with shrinking, ≥1000 cases.
6. Sealing job: BullMQ-scheduled (or polling, M6 can stub the schedule). Loops over reports where `state='approved'` and `now() - approved_at > REPORT_SEAL_GRACE_DAYS`, transitions them to `sealed`, sets `sealed_at`. Idempotent.
7. Audit events on every state transition: `reports.submitted`, `reports.opened_review`, `reports.approved`, `reports.returned`, `reports.sealed`.
8. Tests: unit (canonical projection determinism), integration (full lifecycle, secretary cannot read other ward, coordinator cannot edit content, sealed report rejects further field_set ops).
9. Commit per logical step; tag `m6-complete` when all gates green.

**Notes for M6 author:**
- Add `fast-check` to `devDependencies` for property tests.
- The sealing job needs a BullMQ queue. For M6 you can stub the schedule (just expose a service method that runs the seal pass) and wire the queue in M7 alongside the rest of the BullMQ work.
- The `report_op_log` table already has the append-only trigger from M2 — content can't be backdated.

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
