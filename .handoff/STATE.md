# Build state

**Last updated:** 2026-04-29 by `opencode` (kimi-k2p6)
**Current milestone:** 10 — Communications (complete)
**Status:** ready to start M11

## What's done

### M10 — Communications (this session)
- `MessagingModule` under `src/modules/messaging/`: controller, service, DTOs, adapters, worker.
- `MessagingController`: 4 endpoints
  - `POST /messages/broadcast` — director-only broadcast composer; encrypts body via inline `pgp_sym_encrypt(..., current_setting('app.dek'))`; resolves recipients by scope (`state`/`lga`/`ward`); creates `messages` + `delivery_attempts` rows.
  - `GET /messages/deliveries` — recipient lists own deliveries with cursor pagination (`queued_at DESC, id DESC`).
  - `POST /messages/deliveries/:id/read` — recipient marks delivery as read.
  - `GET /messages/deliveries/:id` — get single delivery.
- Channel adapters: `InAppAdapter`, `EmailAdapter`, `SmsAdapter`, `WhatsAppAdapter` — stub implementations wrapped with `CircuitBreaker` (threshold=5, timeout=30s).
- Quiet-hours gate: `isQuietHoursWat()` checks WAT (UTC+1) 22:00–06:00; non-urgent broadcasts enqueue delayed BullMQ job via `MESSAGES_QUEUE` (`messages.dispatch`).
- `dispatchOneSystem()` runs in a separate system-role `withRlsTransaction` after the director broadcast txn commits, because `delivery_attempts` RLS UPDATE is restricted to `system` + recipient ownership.
- `QueueModule` extended with `MESSAGES_QUEUE` provider/export.
- Migrations: `0006_messaging_rls.sql` (director INSERT on `delivery_attempts`), `0007_delivery_attempts_update_recipient.sql` (recipient UPDATE on own rows).
- Integration tests in `tests/integration/messaging.spec.ts`: 6 tests covering broadcast, listing, mark-read, 404s, coordinator denial (403). `pnpm verify` GREEN (116 tests).
- Fix: constructor injection for adapters required `@Inject()` decorators; plain type-based injection resolved as `undefined` in this NestJS/vitest setup.

### M9 — Investigations (previous session)
- `InvestigationsModule` under `src/modules/investigations/`: controller, service, DTOs.
- `InvestigationsController` with 10 endpoints (all `@Roles('director')`):
  - `POST /investigations` — create case
  - `GET /investigations` — cursor-paginated list
  - `GET /investigations/:id` — get case with evidence array
  - `PATCH /investigations/:id` — update title/summary/status/priority
  - `POST /investigations/:id/close` — close case (sets status=closed, closed_at=now)
  - `POST /investigations/:id/reopen` — reopen case (sets status=open, clears closed_at)
  - `POST /investigations/:id/evidence` — add evidence item (kind ∈ {report_ref, attachment_ref, note, external_link})
  - `DELETE /investigations/:id/evidence/:evidenceId` — remove evidence
  - `GET /investigations/:id/timeline` — activity timeline merging audit_events + evidence additions
- `InvestigationsService`: all DB operations via `withRlsTransaction`, audit hooks on every mutation (`investigations.created`, `.updated`, `.closed`, `.reopened`, `.evidence_added`, `.evidence_removed`).
- Timeline aggregates `audit_events` (target_table='investigations') and `investigation_evidence` rows, sorted chronologically by `occurred_at`/`created_at`.
- `InvestigationsModule` wired into `AppModule`.
- Integration tests in `tests/integration/investigations.spec.ts`: 11 tests covering create, list, get, update, close/reopen, evidence add/remove, timeline, coordinator denial (403), 404 for missing cases.
- `pnpm verify` GREEN: lint 0 warnings, typecheck clean, openapi:check ok (19 paths).
- Note: existing `investigations` and `investigation_evidence` tables from M2 schema (0001_init.sql) were leveraged without migration changes; RLS policies already restricted to director+system.

### M8 — Attachments (previous session)
- `StorageModule` + `StorageService` (S3/MinIO wrapper) under `src/infra/storage/` with `S3_CLIENT` token extracted to `tokens.ts` to break circular dependency.
- `QueueModule` with `OCR_QUEUE` and `ASR_QUEUE` providers under `src/infra/queue/`; both `@Global()`.
- `AttachmentsModule`: controller (`POST /attachments/upload` multipart, `GET /attachments/report/:reportId`), service, DTOs (`UploadAttachmentDto`, `AttachmentResponseDto`).
- `OcrProcessor` and `AsrProcessor` BullMQ workers (`OnModuleInit`/`OnModuleDestroy` lifecycle) injected into `AttachmentsService` for instantiation.
- Workers use `withRlsTransaction` with `role='system'`; fetch `uploaded_by` from `attachments` to satisfy `report_op_log.actor_user_id` FK constraint.
- SQL uses JS-built JSON payload (`JSON.stringify`) passed as `$3::jsonb` to avoid `jsonb_build_object` polymorphic-type errors.
- Attachment upload stores blob in MinIO (`wdc-artefacts` bucket), metadata in `attachments` table, then queues async job. Worker updates `processing_state` to `done`, sets `transcript`/`confidence`/`processing_meta`, and inserts `field_set` op so extracted text joins the report canonical.
- Integration tests in `tests/integration/attachments.spec.ts`: upload image → OCR job processed, upload audio → ASR job processed, list with signed URLs, sealed report rejection (400), mismatched MIME kind rejection (400).
- `tsconfig.json` `types` array extended with `"multer"` for `Express.Multer.File`.
- `pnpm verify` GREEN: 99 tests passing, lint 0 warnings, typecheck clean, openapi:check ok (19 paths).

### M7 — Sync (previous session)
- `SyncModule` + `SyncController` + `SyncService` + `SyncDto` under `src/modules/sync/`.
- `POST /api/v1/sync/batch`: accepts a batch of ops (`field_set`, `attachment_add`, state transitions) with an idempotency key per batch.
- **Idempotency**: same `idempotencyKey` returns the original stored `SyncBatchResponseDto` without duplicate writes. Keyed responses stored in `idempotency_keys` (system role).
- **Cursor pull**: `sinceCursor` on request; response includes `pulledOps` (ops from `report_op_log` with `server_seq > sinceCursor`) and `nextCursor` (max `server_seq` of applied + pulled ops).
- **Batched content ops**: `field_set` + `attachment_add` ops on the same report are inserted in a single transaction with one `reprojectCanonical` call. Per-report state guard (`draft`/`returned` only) and secretary ward-scope check happen inside the same txn.
- **Transitions**: individual `applyTransitionOp()` delegates to `ReportsService.transition()` per op to preserve state-machine guards (sequential by design).
- `addAttachment()` added to `ReportsService` for sync-side use.
- `SyncModule` wired into `AppModule`.
- Tests +5 integration in `tests/integration/sync.spec.ts`: batch apply (`field_set` + `submit`), idempotency replay, idempotency key collision (different ops → same stored response), cursor pull, 50-op load test (<1s).
- `pnpm verify` GREEN: 94 tests passing, lint 0 warnings, typecheck clean, openapi:check ok (19 paths).

### M6 — Reports core
- `ReportsService` + `ReportsController` under `src/modules/reports/`: create draft against deployed `form_version_id` (secretary, own ward), submit, open-review (coordinator), approve, return (with notes), edit-returned (secretary), seal-due (director/system).
- State machine `draft → submitted → in_review → (approved | returned) → sealed`. Returned reports transition back to `draft` via `edit_returned`. Sealed reports reject all content ops via `isEditable()` guard.
- `report_op_log` append-only ops: `field_set`, `attachment_add`, `submit`, `open_review`, `approve`, `return`, `seal`. The `reports.canonical` JSONB is recomputed from the op log on every accept.
- Per-field `source` (`typed`/`voiced`/`scanned`) + `confidence` (`0..1` or `null`) stored on every `field_set` op.
- `approved_at` column (migration `0005_reports_approved_at.sql`) tracks when a report entered `approved`; cleared on `return` so re-approval gets a fresh grace window. Sealing pass uses `approved_at` (not `updated_at`, which the trigger overwrites) to compute grace.
- Property test (`tests/property/report-history.spec.ts`): `fast-check` with 1000 cases confirms `projectCanonical` is shuffle-invariant.
- Tests +16: 10 unit/property (projection determinism, state machine helpers, shuffle-invariance); 6 integration (full lifecycle, return loop with notes, state guards, role guards, sealing pass, scope isolation).
- `pnpm verify` GREEN: 89 tests passing, lint 0 warnings, typecheck clean, openapi:check ok.

### M5 — Forms & versioning
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

Nothing — M10 is complete.

## Next concrete actions (resume here)

Begin **M11 — Audit log**:
1. Daily anchor: scheduled job that reads the latest `audit_events.hash`, signs a digest (RSA or HMAC), stores it in a new `audit_anchors` table with `anchored_at` + `signature`.
2. Sealed CSV export endpoint (`GET /audit/export` or similar) — director-only, streams audit events as CSV with hash chain verification.
3. Commit per logical step; tag `m11-complete` when all gates green.

## Open questions / decisions deferred

- Production hosting target (Galaxy Backbone? Self-managed K8s? AWS af-south-1?) — relevant to M13.
- ASR provider for Hausa (self-hosted Whisper-large-v3 in dev assumed; prod TBD) — M8.
- Audit anchor signing key: use existing JWT RSA keypair (`secrets/jwt-private.pem`) or generate a dedicated anchor key?

## Blockers

- None blocking.

## Do not touch

- `.handoff/DECISIONS.md` is append-only — supersede ADRs, never edit them.
- `docs/spec/` is the original prompts; treat as immutable reference.
- Migrations under `drizzle/0001_*.sql` and later (when they exist) are immutable post-merge — fix bad migrations with new ones.
