# Milestone gates

Every milestone is "done" only when all its gates are ticked AND `pnpm verify` exits 0. The first unchecked box is where the next agent resumes.

## M1 — Skeleton & infra
- [x] `pnpm install` succeeds (one ignored-build-scripts warning is informational, not an error)
- [x] `pnpm build` produces `dist/main.js`; `node dist/main.js` boots
- [x] `curl http://127.0.0.1:3100/health/live` returns 200 with `{"status":"ok","uptime":...}`
- [x] `curl http://127.0.0.1:3100/health/ready` returns 503 with structured `{ info, error, details }` body when postgres is down — gate is "responds correctly to dep state", not "all deps up"
- [x] `pnpm test` — 9 tests passing across 3 spec files
- [x] `pnpm lint` passes (zero warnings, `--max-warnings=0`)
- [x] `pnpm typecheck` passes
- [x] `pnpm openapi:check` passes
- [x] Structured JSON logs to stdout with `req.id` (UUID) on every request and matching `x-request-id` response header
- [x] `pnpm verify` exits 0
- [x] `docker compose up -d` brings up `wdc_postgres`, `wdc_redis`, `wdc_minio` all `Up (healthy)`; `minio-init` created the `wdc-artefacts` bucket; `/health/ready` returns 200 with postgres `up` (28ms) and redis `up` (2ms)
- [x] Commit tagged `m1-complete`

## M2 — Schema & RLS
- [x] All 14+ tables created via numbered SQL migrations under `drizzle/` (`0001_init.sql`, `0002_rls.sql`, `0003_append_only_policies.sql`)
- [x] Drizzle TS schemas in `src/infra/postgres/schema/*.ts` mirror the SQL for type-safe queries
- [x] RLS enabled + `FORCE`d on every table holding user data
- [x] `wdc_app` Postgres role created; app sets `app.current_user_id`/`role`/`lga_id`/`ward_id` via `SELECT set_config(..., true)` per request (via `src/common/rls/rls-context.ts`)
- [x] RLS denial integration tests pass: 11 tests covering secretary/coordinator/director read scope, secretary cross-ward INSERT denial, coordinator cross-LGA write denial, audit_events insert-by-non-system denial, audit_events trigger-enforced append-only on UPDATE+DELETE, report_op_log append-only, deployed form_versions immutable
- [x] Seed script populates 23 LGAs (real Kaduna names) + 255 ward stubs (`<lga>-W<NN>`); idempotent
- [x] OpenAPI snapshot unchanged at M2 (no new endpoints; M3 adds auth)
- [x] Migration runner (`pnpm drizzle:migrate`) — hand-rolled to handle RLS, triggers, and pgvector that drizzle-kit doesn't model
- [x] `pnpm verify` exits 0 — 20 tests pass
- [ ] Commit tagged `m2-complete`

## M3 — Auth
- [x] Sign-in: console (email+password+TOTP director-only), mobile (phone+PIN)
- [x] Refresh-token rotation: 15min RS256 access JWT; 7d refresh hashed-at-rest in `refresh_tokens`; device-bound; `rotated_from_id` chain; reuse-detection revokes the whole device chain (in a separate committed txn so the kill survives the throw)
- [x] TOTP 2FA mandatory for `director` (otplib, ±1 step window)
- [x] Argon2id PIN+password hashing with per-user salt + 32-char per-deployment pepper from secrets manager
- [x] RBAC guards: global `JwtAuthGuard` + `RolesGuard`; `@Public()` opt-out; `@Roles()` for endpoint-level role gating; `rlsContextFromRequest()` builds the RLS context from a verified JWT for service-layer DB calls
- [x] Failed sign-ins, OTP failures, sign-outs all written to hash-chained `audit_events` (canonical-JSON + sha256, with explicit GENESIS for the first row)
- [x] `/auth/sign-in/{mobile,console}`, `/auth/refresh`, `/auth/sign-out` endpoints
- [x] OpenAPI updated; `pnpm openapi:check` reports 6 paths
- [x] `pnpm verify` exits 0 — 46 tests pass (40 unit + 6 auth integration)
- [ ] Commit tagged `m3-complete`

## M4 — Users & onboarding
- [x] Migration `0004_enrolment_tokens.sql` adds `enrolment_token_hash` + `enrolment_expires_at` to `users` (uniq index, partial WHERE NOT NULL)
- [x] `withRlsTransaction` now sets `LOCAL ROLE wdc_app` + `LOCAL app.dek` — RLS engages and pgcrypto column functions can read the DEK
- [x] Phone normalisation (E.164, accepts Nigerian `0…` format) + `phoneHash` / `emailHash` deterministic sha256 helpers
- [x] `pgcryptoEncrypt` / `pgcryptoDecrypt` wrappers around `pgp_sym_*` using session DEK
- [x] `UsersService`: create (with one-time enrolment token, encrypted PII), getById, list (cursor-paginated, RLS-scoped), updateAssignment, setStatus (suspend/reactivate), softDelete — all director-write, RLS-read
- [x] `UsersController`: 7 endpoints under `/api/v1/users` with `@Roles('director')` on writes; `@ApiBearerAuth()` so the openapi exposes auth correctly
- [x] `POST /auth/set-credentials` redeems an enrolment token to set PIN (mobile) or password+TOTP (console)
- [x] Audit events: `users.created`, `users.assignment_changed`, `users.suspended`, `users.reactivated`, `users.deleted`, `auth.enrolment.completed`
- [x] OpenAPI updated to 12 paths (4 auth + 7 users + 2 health) with `User`, `CreateUser`, `CreateUserResponse` schemas
- [x] Tests: 14 new (2 phone, 2 cursor, 6 users integration, 4 spread across existing files via additions). 60 total passing.
- [x] `pnpm verify` exits 0
- [ ] Commit tagged `m4-complete`

## M5 — Forms & versioning
- [x] `FormsService` + `FormsController` + `FormsModule`: 9 endpoints under `/api/v1/forms` (CRUD + version CRUD + deploy/archive + visible)
- [x] Zod-validated form-schema: discriminated union over text/number/date/select/checkbox/photo/audio fields; both `label_en` and `label_ha` are required on every field; section + field key uniqueness enforced
- [x] State machine `draft → deployed → archived` with `POST /:id/deploy` and `POST /:id/archive`
- [x] On deploy: `form_versions.deployed_at` + `deployed_by` set; `forms.current_version_id` updated; the immutability trigger then blocks UPDATE/DELETE on that version
- [x] `GET /forms/visible` returns deployed forms in scope (state-wide, LGA in `scope_ids`, ward in `scope_ids`) — uses Postgres `?` (jsonb has-key) operator against text-keyed arrays
- [x] Audit events: `forms.created`, `forms.updated`, `forms.versioned`, `forms.deployed`, `forms.archived`
- [x] `pnpm verify` exits 0 — 73 tests pass (was 60 → +13)
- [x] OpenAPI: 19 paths total (12 prior + 7 forms)
- [ ] Commit tagged `m5-complete`

## M6 — Reports core
- [x] State machine: `draft → submitted → in_review → (approved | returned) → sealed`
- [x] Append-only history (CRDT-style) — content immutable post-seal
- [x] Property test (fast-check): operations applied in any order yield same canonical state
- [x] Per-field `source` (typed/voiced/scanned) + `confidence` stored
 - [x] Commit tagged `m6-complete`

## M7 — Sync
 - [x] `POST /sync/batch` with idempotency key per batch
 - [x] Same idempotency key returns original result, not duplicate
 - [x] Cursor pull (`since_cursor`) on response
 - [x] Server stamps `server_seq` on accept
 - [x] Sync endpoint accepts 50 ops in <1s under load
 - [x] `pnpm verify` exits 0 — 94 tests pass (89 prior + 5 sync integration)
 - [ ] Commit tagged `m7-complete`

## M8 — Voice & OCR pipelines
- [x] Async ASR (Whisper) job in BullMQ queue `asr.transcribe`
- [x] Async OCR job in BullMQ queue `ocr.process`
- [x] Artefacts stored in S3-compatible (MinIO dev) with signed URLs
- [x] Confidence scores stored per field
- [x] `pnpm verify` exits 0 — 99 tests pass (94 prior + 5 attachments integration)
- [x] Commit tagged `m8-complete`

## M9 — Investigations
- [x] Case CRUD + evidence attachments + activity timeline
- [x] `pnpm verify` exits 0 — 110 tests pass (99 prior + 11 investigations integration)
- [x] Commit tagged `m9-complete`

## M10 — Communications
- [x] Broadcast composer endpoint
- [x] Per-channel adapters (in_app, email, SMS, WhatsApp) with circuit breakers
- [x] Delivery + read tracking
- [x] Quiet hours (22:00–06:00 WAT) for non-urgent
- [x] Commit tagged `m10-complete`

## M11 — Audit log
- [x] Hash-chained appends (`prev_hash`, `hash = sha256(prev_hash || canonical_json)`) — landed in M3
- [x] Migration `0008_audit_anchors.sql`: `audit_anchors` table with append-only trigger + RLS (director-read, system-insert)
- [x] `AnchorService.createAnchor()` signs the latest `audit_events.hash` with the JWT RSA private key (RSA-SHA256, base64url) and inserts an anchor row
- [x] `AnchorService.verify()` checks signature; surfaces `verified` per row in the list endpoint and in the CSV preamble
- [x] `POST /audit/anchor` (director/system trigger), `GET /audit/anchors` (with verify-on-read), `GET /audit/export` (sealed CSV with `# anchor.…` preamble bounded by latest anchor's `latest_event_id`)
- [x] OpenAPI: 22 paths total (19 prior + 3 audit)
- [x] `pnpm verify` exits 0 — 121 tests pass (was 116 → +5: anchor sign+verify, tamper detection, coordinator 403 across 3 endpoints, CSV body shape, append-only trigger fires on `audit_anchors` UPDATE/DELETE)
- [x] Commit tagged `m11-complete`

## M12 — AI Assistant
- [ ] `POST /ai/ask` server-side orchestration (no client-side prompt construction)
- [ ] Structured retrieval (typed SQL on read replica role)
- [ ] Semantic retrieval (pgvector top-K)
- [ ] System prompt forbids fabrication, requires citations
- [ ] Response cache (1h, key = hash(question, retrieval, role_scope))
- [ ] Commit tagged `m12-complete`

## M13 — Observability & ops
- [ ] OpenTelemetry traces to OTLP endpoint
- [ ] Prometheus `/metrics` endpoint
- [ ] Dashboards JSON committed under `ops/dashboards/`
- [ ] Restore drill rehearsed and documented in `RUNBOOK.md`
- [ ] Commit tagged `m13-complete`

## M14 — Hardening
- [ ] `pnpm audit` zero high/critical
- [ ] Container scan (Trivy) zero high/critical
- [ ] Threat model `THREATS.md` complete with mitigations verified
- [ ] Load test results in `LOAD-TEST.md`
- [ ] Commit tagged `m14-complete`
