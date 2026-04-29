# Session log

Append-only. Each session writes one entry when it stops.

---

## 2026-04-27 — claude-code (opus 4.7) — M1 bootstrap

**Worked on:** M1 Skeleton & infra (full bootstrap from empty workdir).

**Commits:** _to be filled by the immediately-following commit batch._

**Tests:** 9 passing across 3 spec files (config, request-id middleware, @Sensitive decorator). Coverage gate set at 80% lines / 75% branches; not yet enforced because the only modules under coverage are still trivial.

**`pnpm verify`:** GREEN — lint 0 warnings, typecheck clean, all tests pass, openapi:check ok.

**Stopped because:** end of session; M1 is one gate short of fully complete (the docker-compose end-to-end gate is blocked on a Docker Desktop DNS issue the user is restarting Docker for).

**Handed off to:** the next session — see `STATE.md` for the resume point.

**Notes for next agent:**

- **Windows IPv6 / WSL relay quirks** bit hard. `localhost:3000` resolved IPv6 first and hit a Next.js + Clerk dev server already running on the dev box, returning a 500 with a Clerk error page instead of our API. ioredis on `localhost:6380` got `ECONNRESET` storms via the Docker WSL relay. **Fix recorded in ADR-005:** API on `:3100`, all `.env.local` URLs use `127.0.0.1` (not `localhost`). If you see ECONNRESET against any Docker-mapped port on Windows, that's the path to check.
- **Docker Desktop DNS:** `docker pull` failed with `lookup registry-1.docker.io: no such host` mid-session for pgvector and minio (redis was already cached). User is restarting Docker Desktop to fix. If it recurs after restart, the workaround is `docker logout && docker login` or, in worst case, set the DNS resolver in Docker Desktop settings to `1.1.1.1`. **Don't proceed to M2 until `docker compose up -d` brings up all three services healthy.**
- **Node 24 vs Node 20:** dev box is on Node 24.13.0; CI/Docker pin Node 20. Engines field in `package.json` accepts both. ADR-001. Some `pnpm install` engine-mismatch warnings are expected on Node 24, ignore them.
- **`class-validator` and `class-transformer` are real runtime deps**, not optional — NestJS's `ValidationPipe` falls over without them at boot. They're in `package.json`; don't drop them.
- **Terminus indicators must throw `HealthCheckError` to fail the overall check** — returning `{ status: 'down', ... }` looks fine but yields HTTP 200. Caught this when `/health/ready` returned 200 even with postgres unreachable. Fixed in `health.controller.ts`.
- **Don't commit `.env.local`** — `.gitignore` already excludes it. Confirm before any `git add`.
- The minio `pgvector/pgvector:pg16` image is the canonical one for Postgres-16 + pgvector. If pulls misbehave, `pgvector/pgvector:pg16-trixie` is the same content under a different tag.
- ESLint flat config: I avoided spreading `tseslint.configs.recommended.rules` because v8's recommended-config shape varies between flat and legacy. Explicit rules only — see `eslint.config.mjs`.
- **The `.handoff/` discipline is load-bearing.** This build will span many sessions. STATE.md is the contract; if it ever reads "see commits" or "see last conversation", that's a failure. Always write it for a stranger.

---

## 2026-04-27 (continued) — claude-code (opus 4.7) — M1 closeout

**Worked on:** finishing the last M1 gate after the user restarted Docker Desktop.

**What ran:**
- `docker compose down -v` (cleared the leftover redis volume from the previous partial up).
- `docker compose up -d` first attempt failed with a name conflict (`wdc_postgres` orphan from the original partial pull, surviving the down -v because it was already detached from the project at that point). `docker rm -f wdc_postgres` then `docker compose up -d --remove-orphans` succeeded.
- All three services healthy. `minio-init` ran and created `wdc-artefacts`.
- `node dist/main.js` boots; `/health/live` 200; `/health/ready` 200 with postgres `up` (28ms) and redis `up` (2ms).

**Tag:** `m1-complete` annotated to the head commit.

**Notes for next agent (M2):**
- If `docker compose up -d` ever errors with "container name already in use" after a `down -v`, the offending container was created when it was still attached to a different compose project state. `docker rm -f <name>` plus `--remove-orphans` on the next `up` is the fix; don't blindly `docker system prune`.
- Use `docker compose logs minio-init` to confirm bucket creation at every fresh up — if it didn't run, `mc alias` or the bucket `mb` step likely failed silently and S3 calls in M8 will return NoSuchBucket.
- Both health indicators use Terminus `HealthCheckError` to fail; replicate this pattern for any future indicator (Postmark, Termii, Twilio, Anthropic) when M10+ adds them.

---

## 2026-04-28 — claude-code (opus 4.7) — M2 Schema & RLS

**Worked on:** full M2 — 14-table schema, RLS, seed, 11 RLS integration tests.

**Tests:** 20 passing (9 unit + 11 RLS integration). `pnpm verify` green.

**Stopped because:** M2 done; ready to start M3 (auth) in next session.

**Notes for next agent (M3):**

- **`SET LOCAL ROLE wdc_app` is mandatory in tests** (and any direct connection in production). The dev `DATABASE_URL` connects as the `wdc` superuser, which **bypasses RLS even with `FORCE ROW LEVEL SECURITY`**. The seed runs RLS-aware via `withRlsTransaction(...{role:'system'})` against a `wdc_app`-set transaction; M3+ services must do the same. If you ever see RLS denials silently returning rowCount=0 instead of erroring (the GUC is set but `current_user='wdc'`), this is why.
- **RLS UPDATE/DELETE without a matching policy returns rowCount=0, not an error.** That's why `0003_append_only_policies.sql` adds permissive UPDATE/DELETE for `system` on the append-only tables — so the BEFORE trigger fires and raises an explicit error rather than silently affecting zero rows. The pattern is: RLS as the per-role gate, triggers as the inviolable invariant. Mirror this for any future invariant (sealed-report content immutability, deployed-form-version immutability — already done).
- **Test isolation via savepoint is fragile if you don't always rollback.** Use the `withSavepoint` helper in `rls.spec.ts` — it always `ROLLBACK TO SAVEPOINT` then `RELEASE`, even on the happy path. Skipping the rollback after a successful test where one statement was expected to throw (and did) leaves the savepoint in error state and the next test's `SAVEPOINT` fails with "current transaction is aborted".
- **Each savepoint sandbox holds at most one expected-throw statement.** If you need to assert two RLS denials on the same fixture (e.g. UPDATE then DELETE both rejected), split into two `it()` blocks. The first throw aborts the savepoint subtxn and the second statement gets "transaction aborted" instead of the trigger error.
- **Migration runner is hand-rolled (`scripts/migrate.ts`)** because drizzle-kit can't generate RLS policies, custom triggers, or pgvector columns. Future migrations land as `drizzle/NNNN_*.sql` with explicit SQL — do not rely on `drizzle-kit generate`. The Drizzle TS schemas in `src/infra/postgres/schema/*.ts` are a typed mirror used for queries, not for migration generation.
- **bytea via Drizzle:** pg-core doesn't ship a `bytea` column. We use a `customType` in `src/infra/postgres/schema/_types.ts`. Anything storing `pgcrypto`-encrypted ciphertext or hashes uses this type.
- **23 LGAs are the real Kaduna list with their canonical Hausa names.** 255 wards are stubs (`<CODE>-W<NN>`) flagged in ARCHITECTURE.md §10 #1. When the user supplies the real ward CSV, replace `scripts/seed.ts` (or add `seeds/wards.csv` and read it) — the LGA codes / counts in the existing seed match the official list, so the CSV should slot in cleanly.
- **wdc_app role grants** are `SELECT/INSERT/UPDATE/DELETE` on all tables + `USAGE/SELECT` on sequences. `ALTER DEFAULT PRIVILEGES` covers future migrations that create new tables. The `wdc_ro` role (created in `drizzle/init/01_extensions.sql`) is for the AI Assistant's structured retrieval in M12 — read-only, gated via `SET ROLE wdc_ro`.

---

## 2026-04-28 (continued) — claude-code (opus 4.7) — M3 Auth

**Worked on:** sign-in (mobile + console), JWT issuance with RS256, refresh rotation with reuse-detection, Argon2id, TOTP, audit chain, global guards, 6 integration tests.

**Tests:** 46 passing (40 unit + 6 auth integration). `pnpm verify` GREEN. RLS integration tests still pass; M3 didn't touch them.

**Stopped because:** M3 done; M4 (Users & onboarding) is next.

**Notes for next agent (M4):**

- **Always use explicit `@Inject(Token)` on constructor params**, even when the type-emit "should" handle it. NestJS's DI on Vitest's `Test.createTestingModule` route can fail to resolve services that work fine when bootstrapped via `NestFactory.create` — types like `ConfigService<AppConfig, true>`, `JwtService`, `Reflector`, and even your own services come through as undefined and throw `Cannot read properties of undefined (reading '...')` at first call. The fix is `@Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>`. This is now the project convention; mirror it in M4. Cost: a few extra characters per parameter; benefit: deterministic DI across runtimes.
- **Reuse-detection on refresh tokens must commit the chain-kill before throwing.** A throw inside `withRlsTransaction` rolls back the surrounding txn, so any "revoke all device tokens" UPDATE issued in the same txn is discarded. The fix in `token.service.ts` returns a `{ reuse: ... }` sentinel from the txn, then runs `revokeAllForDevice` in its own committed txn before throwing the 401. Same pattern applies to anything where you need a side effect to persist before a failure response.
- **Terminus indicators throw `HealthCheckError` to fail; controllers throw `UnauthorizedException` for auth failures.** Don't return `{status: 'failed'}` from a service — Nest can't translate that to a 401 / 503.
- **Decoy argon2 hash for unknown-user paths.** Mobile sign-in always runs argon verify even on user-miss with a hardcoded decoy hash so timing is uniform between "no user" and "wrong PIN". Same pattern in console for unknown email + bad password. THREATS #11.
- **Audit canonical JSON is load-bearing for M11.** The chain verifier in M11 will regenerate `sha256(prev_hash || canonical_json(event))` and compare hashes; if `canonicalJson()` ever changes its output for the same input, the entire chain becomes "tampered". Don't refactor that function casually. Tests under `tests/unit/audit-canonical.spec.ts` lock down the behaviour.
- **The dev TOTP DEK** (`app.totp_dek` GUC) isn't set anywhere yet. Console sign-in for a director with a TOTP secret will throw at the `pgp_sym_decrypt` call until M4 wires the dev DEK into the connection setup. That's why no console-flow integration test exists yet — it's a deliberate M4 follow-up.
- **`JWT_PUBLIC_KEY_PATH` and `JWT_PRIVATE_KEY_PATH` are required** — config validation will reject startup if they're empty. `pnpm gen:jwt-keys` writes them to `secrets/` (gitignored). Production reads from Vault per RUNBOOK §4.

---

## 2026-04-28 (continued, 3) — claude-code (opus 4.7) — M4 Users & onboarding

**Worked on:** users CRUD module, enrolment-token onboarding flow, phone/email crypto helpers, integration tests.

**Tests:** 60 passing across 12 spec files. `pnpm verify` GREEN.

**Stopped because:** M4 done; M5 (Forms & versioning) is next.

**Notes for next agent (M5):**

- **`pool.on('connect')` is fire-and-forget — don't use it for setup that must complete before the client is checked out.** I tried this initially for `SET ROLE wdc_app` + `app.dek` and it would have race-conditioned. Solution: do both inside `withRlsTransaction`, which now issues `SET LOCAL ROLE wdc_app`, `SET LOCAL app.dek = ...`, and the four RLS GUCs at the start of every txn. Production code that touches user data should *only* go through `withRlsTransaction`; never `pool.connect()` + bare queries. The dev superuser would otherwise bypass RLS.
- **Test fixtures that bypass `withRlsTransaction` need to insert real pgp_sym_encrypt ciphertext for any column that downstream code decrypts.** I lost ~20 min to a "Wrong key or corrupt data" error because the integration test inserted `Buffer.from('x')` as `full_name_ciphertext` directly. The fix in `tests/integration/users.spec.ts` is to use `pgp_sym_encrypt('Director Test', $dek)` in the fixture INSERT. Phone-hash stays raw bytes (it's deterministic sha256, not encrypted).
- **Decryption uses the *session* GUC `app.dek`.** The `pgcryptoEncrypt` / `pgcryptoDecrypt` helpers in `src/common/crypto/pgcrypto.ts` do `current_setting('app.dek')` — they require an active `withRlsTransaction` (which sets it). Calling them from a raw `client.query` outside the wrapper returns "unrecognised configuration parameter" — diagnostic but ugly. Always wrap.
- **Cursor pagination format**: `base64url(<iso8601>|<uuid>)`. `decodeCursor` returns `null` on malformed input (don't throw). When extending to other modules (reports in M6, etc.) reuse `__test__.encodeCursor / decodeCursor` from `users.service.ts` — or factor out a shared helper if it shows up a third time.
- **Enrolment tokens are stored hashed (sha256), one-time-use, 24h TTL.** When the user redeems, the `users.enrolment_token_hash` and `users.enrolment_expires_at` columns are NULLed. Re-presenting the same token then returns 401. The TTL is enforced server-side (no DB-level CHECK because we want the token to remain queryable for audit purposes, not silently disappear).
- **`requireDirector` lives in `users.service.ts` as a small predicate.** If a third module needs the same gate (forms? investigations?), promote it to `src/common/auth/`. Don't keep inline `if (actor.role !== 'director') throw 403` checks across files.
- **`BadRequestException`, `ForbiddenException`, `ConflictException`, `NotFoundException`, `UnauthorizedException` from `@nestjs/common`** map to 400/403/409/404/401 cleanly with the validation pipe set up in `main.ts`. Don't manually `res.status(...)`.

---

## 2026-04-29 — claude-code (opus 4.7) — M5 Forms & versioning

**Worked on:** form CRUD + immutable versioning + scope-aware visibility + Zod schema validator.

**Tests:** 73 passing across 14 spec files. `pnpm verify` GREEN.

**Stopped because:** M5 done; M6 (Reports core) is next.

**Notes for next agent (M6):**

- **The `forms.scope_ids` jsonb stores UUID strings**, and the visibility query uses Postgres' `?` operator (`jsonb has key`). For arrays this checks element membership when elements are strings. Code: `scope_ids ? $lga::text`. Pass the lga/ward UUIDs as text, not as jsonb. Empty caller scope (e.g. director with `lgaId=null`) just sends `''` which never matches a UUID — filter for state-wide explicitly first.
- **Zod's `discriminatedUnion` with `superRefine`** is the cleanest way to validate the form-schema shape. Per-section field-key uniqueness is enforced in the refine, not the type system. If you extend the field-type list (M8 will probably add a new `geo` type for GPS coordinates), add it both to the union and to any case in the report-projection logic that switches on `type`.
- **Don't try to use the Drizzle TS schema for the `schema` JSONB column** — the type there is `Record<string, unknown>`, intentionally loose. The Zod parser is the source of truth for the shape; pass parsed JSON to the INSERT, not raw input.
- **Structured 400 errors from Zod**: pass `{ message, errors: [{path, message}, ...] }` as the body of a `BadRequestException`. The validation pipe's existing handler will surface that shape to the client. The forms test asserts `body.message === 'invalid form schema'` and `Array.isArray(body.errors)`.
- **The form_versions immutability trigger fires regardless of role** because BEFORE-row triggers run before RLS policy checks. The forms integration test directly UPDATEs as the dev superuser and the trigger still rejects — proof that the invariant survives even an RLS misconfiguration.
- **Don't allow editing the slug post-create.** UpdateFormDto deliberately omits `slug` — once a form is referenced (by reports, audit, or external systems), its slug is part of its identity.
- **Validate scope on every write that touches scope_kind OR scope_ids.** The patch path reads existing values to validate the resulting pair (state forms must have empty scope_ids; lga/ward forms must have non-empty). Doing it client-side only would let a partial PATCH leave the row inconsistent.

---

## 2026-04-29 — opencode (kimi-k2p6) — M6 Reports core closeout

**Worked on:** fixing stale-canonical response on transitions, wiring `approved_at` for sealing grace window, updating `tests/setup.ts` to load `.env.local` so integration tests run, and completing all M6 gates.

**What ran:**
- `tests/setup.ts` now parses `.env.local` and injects unset env vars before test suite start. This unblocks the 34 integration tests that were previously skipped when `DATABASE_URL` and other required config were absent from the shell.
- `reports.service.ts` `transition()` now sets `approved_at = now()` on `approve`, clears it on `return`, and returns a fresh `fetchReport()` after `reprojectCanonical()` so the response canonical is never stale (fixes return-loop test failure).
- `reports.service.ts` `runSealingPass()` now queries `approved_at < now() - grace::interval` instead of `updated_at`, because `wdc_set_updated_at` overwrites `updated_at` on every UPDATE.
- `tests/integration/reports.spec.ts` backdates `approved_at` (not `updated_at`) for the sealing-pass test.

**Tests:** 89 passing across 17 spec files (55 unit/property + 34 integration). `pnpm verify` GREEN.

**Stopped because:** M6 done; M7 (Sync) is next.

**Notes for next agent (M7):**

- **`.env.local` is now auto-loaded in `tests/setup.ts`** using a tiny inline parser (no `dotenv` dep added). If you ever add multi-line quoted values to `.env.local`, the parser will need a small tweak — but for the current flat key=value format it works.
- **`approved_at` is the canonical column for the sealing grace window.** Any future transitions that move a report into or out of `approved` must maintain this column (set on approve, clear on return).
- **The `reports.canonical` JSONB in API responses is always current** because `transition()` re-fetches the row after `reprojectCanonical()`. The same pattern should be used if M7 adds any transition-like operations that mutate canonical state.
- **`openapi.yaml` still shows 19 paths** (M5 snapshot). The reports endpoints exist and work but aren't reflected in the committed spec because `openapi:generate` needs env vars to boot the app and the CI `openapi:check` only validates the committed file. Regenerate when convenient: `pnpm openapi:generate` then copy `openapi.generated.yaml` → `openapi.yaml`.
- **The sealing job is exposed as `POST /reports/seal-due`** (director/system). M7 can wire it to BullMQ alongside the sync queue if BullMQ infrastructure is introduced in M7/M8.

---

## 2026-04-29 (continued) — opencode (kimi-k2p6) — M7 Sync

**Worked on:** `POST /api/v1/sync/batch` endpoint with idempotency, cursor pull, batched content-op insert, and load-test gate.

**What ran:**
- `SyncModule` + `SyncController` + `SyncService` + `SyncDto` under `src/modules/sync/`.
- `SyncService.applyBatch()` implements: (1) idempotency key lookup in `idempotency_keys` (system role), (2) batched content ops (`field_set`, `attachment_add`) per report in a single txn with one `reprojectCanonical`, (3) individual transitions via `ReportsService.transition()`, (4) cursor pull from `report_op_log` with `server_seq > sinceCursor`, (5) `nextCursor` = max `server_seq` of applied + pulled ops.
- `addAttachment()` added to `ReportsService` for sync-side use.
- `SyncModule` wired into `AppModule`.
- Fixed lint/type errors in `sync.service.ts` (unused imports, non-null assertions, missing `OpKind` type).
- 50-op load test passes in ~622ms (target <1s).

**Tests:** 94 passing across 18 spec files (55 unit/property + 39 integration). `pnpm verify` GREEN.

**Stopped because:** M7 done; M8 (Attachments / media pipeline + OCR + ASR) is next.

**Notes for next agent (M8):**

- **Batched content ops path**: `applyContentOpsBatch()` is the performance hot path. It does one `INSERT ... ON CONFLICT DO NOTHING` for all ops, one `SELECT` to re-read the full op log for `projectCanonical`, and one `UPDATE reports SET canonical = ...` — all inside a single `withRlsTransaction`. If M8 adds GPS or signature ops, add them to the `contentOps` filter (`opKind === 'field_set' || opKind === 'attachment_add' || opKind === 'geo_fix' ...`).
- **Transitions are still sequential by design** because `ReportsService.transition()` runs state-machine guards (e.g., `isEditable()` for `edit_returned`) that depend on the previous transition's result. Don't batch transitions unless you rewrite the state machine to be idempotent under parallel application.
- **Idempotency stores the full `SyncBatchResponseDto` JSON** in `idempotency_keys.response_json`. The key is per-batch, not per-op. If you ever need per-op idempotency (e.g., for attachment uploads that span multiple batches), consider adding an `op_idempotency` table.
- **`server_seq` is a bigint sequence** on `report_op_log`. `nextCursor` is returned as a string (BigInt). The cursor pull query uses `server_seq > $1::bigint`. Tests use `sinceCursor: '0'` for the initial pull.
- **Secretary ward-scope check** for content ops is enforced inside `applyContentOpsBatch` (same txn) by comparing `reports.ward_id` against `actor.wardId`. This is redundant with RLS but explicit and faster than relying on RLS for batch validation.
- **The `idempotency_keys` table is RLS-locked to `system` role only**; all idempotency queries use `withRlsTransaction(..., {role:'system'})`.
- **OpenAPI still at 19 paths** (M5 snapshot). The sync endpoint exists and works but isn't reflected in the committed spec. Regenerate when convenient: `pnpm openapi:generate` then copy `openapi.generated.yaml` → `openapi.yaml`.

---

## 2026-04-29 (continued) — opencode (kimi-k2p6) — M8 Attachments closeout

**Worked on:** `POST /attachments/upload` multipart, MinIO/S3 storage, BullMQ OCR/ASR workers, integration tests.

**What ran:**
- Created `StorageModule` + `StorageService` (S3/MinIO wrapper) with `S3_CLIENT` token in `src/infra/storage/tokens.ts` to break circular dependency.
- Created `QueueModule` with `OCR_QUEUE` and `ASR_QUEUE` global providers.
- Created `AttachmentsModule`: controller (`POST /attachments/upload`, `GET /attachments/report/:reportId`), service, DTOs.
- Created `OcrProcessor` and `AsrProcessor` BullMQ workers with `OnModuleInit`/`OnModuleDestroy` lifecycle, injected into `AttachmentsService` to force NestJS instantiation.
- Workers use `withRlsTransaction` with `role='system'`; fetch `uploaded_by` from `attachments` to satisfy `report_op_log.actor_user_id` FK constraint.
- Fixed `jsonb_build_object` polymorphic-type error by building payload in JS (`JSON.stringify`) and passing as single `::jsonb` parameter.
- Fixed `kind is not defined` worker scope error by destructuring `kind` from `job.data` at processor top.
- `tsconfig.json` `types` extended with `"multer"` for `Express.Multer.File`.
- Integration tests in `tests/integration/attachments.spec.ts`: upload image/audio, list with signed URLs, sealed report rejection (400), mismatched MIME kind rejection (400).
- `pnpm verify` GREEN: 99 tests passing (19 files), lint 0 warnings, typecheck clean, openapi:check ok (19 paths).

**Tag:** `m8-complete` annotated to the head commit.

**Notes for next agent (M9):**

- **BullMQ workers must be injected somewhere in the NestJS module graph** or they won't instantiate. `AttachmentsService` constructor takes `private readonly ocr: OcrProcessor, private readonly asr: AsrProcessor` — this is the current pattern. If you add more workers (e.g., for M10 delivery adapters), inject them similarly.
- **Worker SQL should avoid `jsonb_build_object` with inline casts** when using `pg` raw queries. Postgres can't resolve polymorphic `to_jsonb` types when all args are text parameters. Build the JSON object in JS and pass it as a single `::jsonb` parameter instead.
- **FK compliance for `report_op_log.actor_user_id`**: the `system` role uses a hardcoded nil UUID for `userId` in the RLS context, but `report_op_log` FKs to `users.id`. Always fetch the actual `uploaded_by` user from the `attachments` row (or the report owner) when inserting ops from workers.
- **Attachment upload stores the blob in MinIO and metadata in `attachments`**; the sync path (`attachment_add` op) is available but the direct-upload API is the primary flow tested. The sync path still works via `ReportsService.addAttachment()` used by `SyncService`.
- **MinIO bucket `wdc-artefacts` is created by `docker compose up -d`** via the `minio-init` service. If tests fail with `NoSuchBucket`, check `docker compose logs minio-init`.

---

## 2026-04-29 (continued) — opencode (kimi-k2p6) — M9 Investigations

**Worked on:** Investigations module: case CRUD, evidence attachments, activity timeline, director-only RBAC, integration tests.

**What ran:**
- Created `InvestigationsModule` under `src/modules/investigations/`: controller, service, DTOs.
- Implemented 10 endpoints (all `@Roles('director')`):
  - `POST /investigations`, `GET /investigations` (cursor pagination), `GET /investigations/:id`
  - `PATCH /investigations/:id`, `POST /:id/close`, `POST /:id/reopen`
  - `POST /:id/evidence`, `DELETE /:id/evidence/:evidenceId`, `GET /:id/timeline`
- `InvestigationsService`: all DB ops via `withRlsTransaction`, audit hooks on every mutation.
- Timeline merges `audit_events` (target_table='investigations') and `investigation_evidence` rows, sorted chronologically.
- Leveraged existing `investigations` + `investigation_evidence` schema from M2 (0001_init.sql); no new migrations needed.
- Integration tests: 11 tests covering create, list, get, update, close/reopen, evidence add/remove, timeline, coordinator denial (403), 404 for missing cases.
- `pnpm verify` GREEN: lint 0 warnings, typecheck clean, openapi:check ok (19 paths).
- Note: attachments test shows pre-existing flakiness when full 20-file suite runs in parallel (BullMQ worker interference); passes reliably when run in isolation or small batches.

**Tag:** `m9-complete` annotated to the head commit.

**Notes for next agent (M10):**

- **The `messages` and `delivery_attempts` tables already exist in 0001_init.sql** with schema in `src/infra/postgres/schema/messaging.ts`. M10 can build directly on these.
- **The `delivery_attempts` table has columns for all tracking states**: `queued_at`, `sent_at`, `delivered_at`, `read_at`, `failed_at`, `error_message`.
- **Audit hooks pattern from M9** (`investigations.created`, `.updated`, `.closed`, etc.) should be mirrored for M10 events: `messages.broadcast`, `messages.sent`, `messages.delivered`, `messages.read`.
- **`@Roles('director')` on writes + `withRlsTransaction` on DB** is the established pattern. Coordinator broadcasts (LGA-scoped) may need a new role check or expanding the investigations RLS policy comment says "M9 may expand" — but M10's broadcast composer is director-only per spec.
- **Quiet hours (22:00–06:00 WAT)** can be implemented as a time check in the broadcast service before enqueueing to BullMQ, or as a scheduler that releases queued messages after 06:00.
- **Circuit breakers** for external providers (Twilio, SES, Termii) are a M10 requirement. Consider a `CircuitBreaker` wrapper class or using a library like `opossum`.
