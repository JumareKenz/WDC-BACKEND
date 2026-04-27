# Milestone gates

Every milestone is "done" only when all its gates are ticked AND `pnpm verify` exits 0. The first unchecked box is where the next agent resumes.

## M1 — Skeleton & infra
- [~] `docker compose up -d` brings up postgres, redis, minio (non-conflicting ports) — **partial**: redis up & verified; postgres + minio pulls blocked by Docker Desktop DNS resolver (see SESSION-LOG 2026-04-27). Re-run after restarting Docker Desktop.
- [x] `pnpm install` succeeds (one ignored-build-scripts warning is informational, not an error)
- [x] `pnpm build` produces `dist/main.js`; `node dist/main.js` boots
- [x] `curl http://127.0.0.1:3100/health/live` returns 200 with `{"status":"ok","uptime":...}`
- [x] `curl http://127.0.0.1:3100/health/ready` returns 503 (postgres down) with structured `{ info, error, details }` body — gate is "responds correctly", not "all deps up"
- [x] `pnpm test` — 9 tests passing across 3 spec files
- [x] `pnpm lint` passes (zero warnings, `--max-warnings=0`)
- [x] `pnpm typecheck` passes
- [x] `pnpm openapi:check` passes
- [x] Structured JSON logs to stdout with `req.id` (UUID) on every request and matching `x-request-id` response header
- [x] `pnpm verify` exits 0
- [ ] `docker compose up -d` re-verified end-to-end after Docker Desktop restart (gates this milestone fully complete)
- [ ] Commit tagged `m1-complete`

## M2 — Schema & RLS
- [ ] All tables created via numbered Drizzle migrations under `drizzle/`
- [ ] RLS enabled on every table holding user data
- [ ] App sets `app.current_user_id`, `app.current_role`, `app.current_lga_id`, `app.current_ward_id` per session via `SET LOCAL`
- [ ] RLS denial integration test passes for each role × each table (Testcontainers)
- [ ] Seed script populates 23 LGAs and 255 ward stubs
- [ ] OpenAPI snapshot updated
- [ ] Coverage gate met (≥ 80% lines for services & domain)
- [ ] Commit tagged `m2-complete`

## M3 — Auth
- [ ] Sign-in (email+password for console, phone+PIN for mobile)
- [ ] Refresh-token rotation (7d, hashed-at-rest, device-bound for mobile)
- [ ] TOTP 2FA mandatory for `director` role
- [ ] Argon2id PIN hashing with per-user salt + per-deployment pepper
- [ ] RBAC guards (`@Roles()` decorator) + RLS context-setter middleware
- [ ] Failed sign-ins, OTP timeouts, RLS denials logged to audit
- [ ] Commit tagged `m3-complete`

## M4 — Users & onboarding
- [ ] Coordinator/secretary CRUD + assignment to LGA/ward
- [ ] Audit hooks on every write
- [ ] Commit tagged `m4-complete`

## M5 — Forms & versioning
- [ ] `Form` + `FormVersion` (immutable post-deploy) + scope (state/LGA/ward)
- [ ] Hausa label as first-class field property
- [ ] Commit tagged `m5-complete`

## M6 — Reports core
- [ ] State machine: `draft → submitted → in_review → (approved | returned) → sealed`
- [ ] Append-only history (CRDT-style) — content immutable post-seal
- [ ] Property test (fast-check): operations applied in any order yield same canonical state
- [ ] Per-field `source` (typed/voiced/scanned) + `confidence` stored
- [ ] Commit tagged `m6-complete`

## M7 — Sync
- [ ] `POST /sync/batch` with idempotency key per operation
- [ ] Same idempotency key returns original result, not duplicate
- [ ] Cursor pull (`since_cursor`) on response
- [ ] Server stamps `server_seq` on accept
- [ ] Sync endpoint accepts 50 ops in <1s under load
- [ ] Commit tagged `m7-complete`

## M8 — Voice & OCR pipelines
- [ ] Async ASR (Whisper) job in BullMQ queue `asr.transcribe`
- [ ] Async OCR job in BullMQ queue `ocr.process`
- [ ] Artefacts stored in S3-compatible (MinIO dev) with signed URLs
- [ ] Confidence scores stored per field
- [ ] Commit tagged `m8-complete`

## M9 — Investigations
- [ ] Case CRUD + evidence attachments + activity timeline
- [ ] Commit tagged `m9-complete`

## M10 — Communications
- [ ] Broadcast composer endpoint
- [ ] Per-channel adapters (in_app, email, SMS, WhatsApp) with circuit breakers
- [ ] Delivery + read tracking
- [ ] Quiet hours (22:00–06:00 WAT) for non-urgent
- [ ] Commit tagged `m10-complete`

## M11 — Audit log
- [ ] Hash-chained appends (`prev_hash`, `hash = sha256(prev_hash || canonical_json)`)
- [ ] Daily anchor signed digest stored separately
- [ ] Sealed CSV export
- [ ] Commit tagged `m11-complete`

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
