# Conventions

This file is the **portable substitute** for the Claude Code skills referenced in the original prompt. Any agent on any platform reads this and works to the same standard.

## Schema design (Drizzle + Postgres 16)

- **Naming:** `snake_case` for tables and columns; tables plural (`reports`, `form_versions`); junction tables `<a>_<b>` alphabetised.
- **Primary keys:** `id uuid primary key default gen_random_uuid()` unless append-only / event-log, in which case `(stream_id, op_id)` composite with `op_id uuid` (UUIDv7 generated client-side, server validates).
- **Foreign keys:** always declared, always `on delete restrict` unless soft-delete is the explicit pattern. Names: `<table>_<col>_fkey` (Drizzle default).
- **Timestamps:** every table has `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`. Triggers maintain `updated_at`.
- **Soft delete:** `deleted_at timestamptz null`; never delete user-owned rows physically. RLS policies must filter `deleted_at is null` for read paths.
- **Indexes:** every FK is indexed. Compound indexes leading with the most selective column. Explain every non-obvious index in a `-- index rationale:` comment.
- **RLS:** enabled on every table holding user data. Policies are written separately in their own migration following the table migration. App sets `app.current_user_id`, `app.current_role`, `app.current_lga_id`, `app.current_ward_id` via `SET LOCAL` at the start of each request.
- **Migrations:** numbered `NNNN_description.sql` under `drizzle/`. **Never edited after merge** — additive only. A bad migration is fixed with a new migration that supersedes it.
- **Money / numerics:** never `float`. Use `numeric(precision, scale)` with explicit precision.
- **Enum-like fields:** use Postgres `text` + `check (col in (...))` rather than `enum` types (easier to evolve).

## API design (NestJS 10 + REST + OpenAPI 3.1)

- **Versioning:** URL prefix `/api/v1`. Breaking changes require a new version, not a header trick.
- **Resource naming:** plural nouns (`/reports`, `/wards`). Sub-resources nested only where the relation is owning (`/reports/:id/attachments`).
- **HTTP verbs:** `GET` (idempotent read), `POST` (create / RPC-like action), `PATCH` (partial update), `PUT` (full replace, rare), `DELETE` (soft).
- **Pagination:** **cursor-only**, never offset. Response shape: `{ items: [...], next_cursor: "<opaque>" | null }`. Cursor encodes `(server_seq, id)` base64-encoded.
- **Error shape:** RFC 7807 problem+json: `{ type, title, status, detail, instance, errors? }`. `errors` is per-field for 422.
- **Idempotency:** every non-GET endpoint accepts `Idempotency-Key` header. The `@Idempotent()` decorator persists `(key, request_hash) → response` for 24h in Redis. Same key + same hash returns cached response; same key + different hash returns 422.
- **Localization:** `Accept-Language` request header → `Content-Language` response header. Validation errors localised. Default `en-NG`; `ha-NG` (Hausa) supported throughout.
- **OpenAPI:** generated from `@nestjs/swagger` decorators, written to `openapi.yaml` on `pnpm openapi:generate`, diff-checked in CI.

## Testing

- **Unit:** pure functions, services with mocked repos, ≥80% lines for `src/modules/*/`, ≥90% for state-machines and crypto. Vitest.
- **Integration:** every endpoint has a happy-path test + an RLS-denial test against ephemeral Postgres (Testcontainers). Spin up real Redis + MinIO too. No mocks at this layer.
- **Property:** sync/CRDT semantics via `fast-check`. Goal: same operations, any order → same canonical state. Minimum 1000 cases per property.
- **Load:** `k6` scripts under `tests/load/`. Targets: p95 read <200ms @ 100 RPS; p95 write <500ms; sync 50 ops <1s.
- **Coverage gate:** enforced in CI; merging below the gate is blocked.

## Observability

- **Logging:** `pino` (JSON to stdout). Required fields on every log line: `time`, `level`, `msg`, `request_id`, `user_id` (when present), `role`, `module`. Never log PII; redaction middleware strips `@Sensitive()`-tagged fields.
- **Tracing:** OpenTelemetry. Every HTTP request begins a span; queue jobs continue the trace via context propagation. Span name format: `<verb> <route_template>` for HTTP; `job:<queue>:<name>` for jobs.
- **Metrics:** Prometheus, exposed on `/metrics`. Histograms for latency, counters for errors per endpoint per role, gauges for queue depth and circuit-breaker state. Naming: `wdc_<subsystem>_<metric>_<unit>`.
- **Request ID:** middleware reads `X-Request-Id` if present (validate UUID), else generates UUIDv7. Propagated to logs, traces, queue jobs, downstream HTTP calls.

## Security

- **PII tagging:** the `@Sensitive()` decorator (in `src/common/decorators/sensitive.ts`) marks fields that must never appear in logs. Logging middleware strips them via reflection.
- **Encryption at rest:** column-level via `pgcrypto` for names, phone plaintext, voice transcript text. App key wrapped by KMS; key id stored alongside ciphertext for rotation.
- **Phone numbers:** stored twice — `phone_hash` (sha256 of E.164, indexed for lookup) and `phone_ciphertext` (pgcrypto-encrypted, for display only).
- **Auth:** JWT access (15min, RS256), refresh (7d, hashed at rest, rotated on use). TOTP for `director`. PINs Argon2id (`m=64MB`, `t=3`, `p=1`) with per-user salt + per-deployment pepper from secrets manager.
- **Rate limiting:** sliding-window in Redis; key = `(role, device_id, route_template)`; limits configured per-route via `@RateLimit()` decorator.
- **TLS:** 1.3 only at edge. Internal traffic mTLS in production.
- **Secrets:** never in committed `.env`. `.env.example` lists all required vars. Production reads from Vault (or AWS Secrets Manager). Dev reads `.env.local` (git-ignored).

## Commits & branches

- **Conventional Commits**: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs(scope): …`, `test(scope): …`, `refactor(scope): …`, `perf(scope): …`. Scope is the bounded context (`auth`, `reports`, etc.) or `infra`.
- **One logical change per commit.** Run `pnpm verify` before every commit. (A pre-commit hook to enforce this is a deliberate non-goal at M1 — wire `simple-git-hooks` or `lefthook` once the team has agreed on tooling, then add it as its own commit and update this section.)
- **`pnpm verify` is the green-light gate, not a ship gate.** It runs `lint && typecheck && test && openapi:check`. It does **not** run `pnpm build` (which uses webpack via `nest build` and can fail in ways `tsc --noEmit` does not). Smoke-boot the compiled app at least once per milestone (`pnpm build && node dist/main.js`) — CI's container-build job catches this for you on every PR.
- **Milestone tags:** `m1-complete`, `m2-complete`, …, annotated tags with the STATE.md "what's done" excerpt as the message.

## AI orchestration (M12+)

- **Prompt templates:** under `src/modules/ai/prompts/` as `.md` files imported via `import.meta.glob` or fs-read at startup. Never inline.
- **Citation format:** every assistant claim includes `[source: structured#<query_id>]` or `[source: semantic#<embedding_id>]`. Server validates citations exist before returning.
- **Cache key:** `sha256(question_normalized || retrieval_results_canonical || role_scope)`. TTL 1h. Stored in Redis under `ai:cache:<hash>`.
- **System prompt rule:** forbids fabricating numbers, requires explicit "data unavailable" when retrieval returns empty.

## Continuity (per Continuity Addendum)

- `.handoff/STATE.md` updated **before every session ends**, written for a stranger.
- `.handoff/SESSION-LOG.md` appended (never edited) with timestamp, work done, commits, gotchas.
- `.handoff/DECISIONS.md` append-only ADR log; supersession by new ADR, never silent edit.
- Never commit agent-private dirs (`.claude/`, `.cursor/`, `.aider*`, `.kimi/`, `.opencode/`).
- `pnpm verify` is the green-light contract; never hand off red.
