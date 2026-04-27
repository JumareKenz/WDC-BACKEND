# Claude Code prompt: Build the WDC Kaduna State backend

Paste the prompt below into Claude Code as a single message. Recommended skills to install before starting (from `alirezarezvani/claude-skills`):

```
/plugin marketplace add alirezarezvani/claude-skills
/plugin install engineering-advanced-skills@claude-code-skills
# In particular it pulls in: database-schema-designer, migration-architect,
# api-design-reviewer, api-test-suite-builder, rag-architect,
# observability-designer, ci-cd-pipeline-builder, dependency-auditor,
# release-manager, incident-commander
/plugin install skill-security-auditor@claude-code-skills
```

---

## THE PROMPT

You are a senior backend engineer with deep production experience designing API platforms, multi-tenant data systems, offline-first sync, and AI-augmented services for low-resource environments. You will build the backend for the **Kaduna State WDC Digital Reporting Platform** — a real Nigerian state government system. This is not a toy. The platform serves 255 wards across 23 LGAs, with three role tiers (Ward Secretary, LGA Alliance Coordinator, State Alliance Director) and three submission paths (voice, OCR, typed wizard) converging on a single canonical report.

**Operate as if your work will be deployed to production for the Government of Kaduna State.** No shortcuts, no `TODO` comments, no swallowed errors, no hand-waved security. Every decision must be defensible.

### Mandatory pre-work (do this before writing any code)

1. Read each of these skills' `SKILL.md` files end-to-end and follow their conventions: `database-schema-designer`, `migration-architect`, `api-design-reviewer`, `api-test-suite-builder`, `rag-architect`, `observability-designer`, `ci-cd-pipeline-builder`, `dependency-auditor`, `release-manager`.
2. Produce an `ARCHITECTURE.md` at the repo root with: stack rationale, module boundaries, data-flow diagrams (in Mermaid), threat model, capacity assumptions, and the explicit list of decisions you made (with the rejected alternative and why). Keep this updated as you go.
3. Run `git init` and commit per logical milestone — schema, then auth, then sync, etc. Conventional Commits.

### Non-negotiable architecture decisions

- **Language & framework:** TypeScript with **NestJS 10+** on Node 20 LTS. Modular architecture; one Nest module per bounded context (`auth`, `users`, `wards`, `forms`, `reports`, `sync`, `messaging`, `investigations`, `audit`, `ai`, `notifications`).
- **Database:** **PostgreSQL 16** as the system of record. Use **Drizzle ORM** for type-safe queries and migrations (do not use TypeORM — its migration story is fragile). Enable **Row-Level Security (RLS)** and write policies that enforce role scope at the database, not the application layer. The application supplies `app.current_user_id`, `app.current_role`, `app.current_lga_id`, `app.current_ward_id` per session via `SET LOCAL`.
- **Object storage:** **S3-compatible** (MinIO in dev, AWS S3 or compatible in prod) for OCR images, voice notes, evidence attachments, signed PDF exports.
- **Cache + queues:** **Redis 7** (cache + BullMQ job queue). Queues: `sync.ingest`, `ocr.process`, `asr.transcribe`, `notifications.dispatch`, `ai.embed`, `audit.seal`.
- **Search & AI:** **pgvector** extension on the same Postgres for RAG embeddings. Don't add a separate vector DB — operational simplicity wins. Use Anthropic's API (Claude Sonnet 4.6 for the AI Assistant) and an open ASR (Whisper-based) for Hausa voice transcription.
- **API style:** **REST + JSON**, OpenAPI 3.1 generated from Nest decorators (`@nestjs/swagger`). Versioned via URL prefix (`/api/v1`). Cursor-paginated everywhere — never offset.
- **Auth:** Short-lived **JWT access tokens (15 min)** + **refresh tokens (7 days, rotating, stored hashed)**. Mobile app uses device-bound refresh. State Console enforces TOTP 2FA on sign-in. PINs (mobile) are **Argon2id**-hashed with a per-user salt and a per-deployment pepper from secrets manager.
- **Observability:** **OpenTelemetry** for traces, structured logs in **JSON** to stdout, **Prometheus** metrics endpoint. Every request gets a `request_id` propagated through job queues. Build dashboards for the four golden signals (latency, traffic, errors, saturation) per endpoint and per role.
- **Secrets:** **NEVER** in `.env` committed to git. `.env.example` only. Production reads from **HashiCorp Vault** (or AWS Secrets Manager); dev reads from a `.env.local` git-ignored file.
- **Containers:** Multi-stage Dockerfile, distroless runtime image, non-root user, read-only root filesystem.
- **CI/CD:** GitHub Actions. Lint + typecheck + unit tests + integration tests (with ephemeral Postgres) + dependency audit + container scan + OpenAPI breaking-change check on every PR.

### Core domain rules (these are not optional)

**Roles & scope (enforce at DB via RLS, not app):**
- `secretary` — read+write only their own ward's reports and messages; cannot see other wards.
- `coordinator` — read all wards in their LGA, write approval/return decisions, send LGA broadcasts; cannot edit ward reports' content.
- `director` — full state read; write forms, users, investigations, broadcasts, settings; cannot retroactively edit a sealed report's content (only its review state).
- `system` — used by background jobs; logged distinctly in audit.

**Reports:**
- A `Report` is the canonical record. Every report references one `FormVersion` (immutable snapshot of the form at submission time).
- Three submission paths produce one report: `submission_method` ∈ `{amira, wizard, snap}`. Each method may attach raw artefacts (audio file, captured image, transcript) — these are first-class, not metadata.
- Reports have a state machine: `draft → submitted → in_review → (approved | returned) → sealed`. Returned reports go back to `draft` when the secretary edits. Once `sealed` (after approval + N days), content is immutable.
- Every field in a report carries `source` (typed/voiced/scanned) and, when scanned/voiced, a `confidence` score (0–1). The Coordinator's review UI uses this.

**Offline-first sync:**
- Mobile clients submit via **`POST /sync/batch`** with an array of operations and an **idempotency key per operation**. Server is responsible for de-duplicating. Returning the same idempotency key MUST return the original result, not a duplicate.
- Conflict resolution: **Last-Writer-Wins is BANNED for report content.** Use **CRDT-style append-only semantics**: a report's history is a log of operations; the canonical state is derived. Coordinator review actions are similarly append-only — you can't lose a decision.
- Each operation carries a client-generated `op_id` (UUIDv7), a `wall_clock_ts`, and a `device_id`. Server stamps a `server_seq` on accept.
- Sync responses include `since_cursor` for the client to use on next pull.

**Form Builder & versioning:**
- A `Form` has many `FormVersion`s. Versions are **immutable** once deployed. Editing a deployed form creates a new version. Reports always reference the version they were filled against — never the form root — so historical reports remain interpretable forever.
- Form scope: state-wide, LGA-scoped (specific LGA IDs), or pilot (specific ward IDs). Enforced when computing which form a secretary sees.
- Each field carries a Hausa label as a first-class property. The mobile app picks the label by the user's locale; both labels are always present in storage.

**Audit log:**
- Every write at coordinator and director level appends to an `audit_event` table.
- Each event includes `prev_hash`, and `hash = sha256(prev_hash || canonical_json(event))`. The chain is anchored daily via a signed digest stored separately. This makes tamper detection trivial and the export "sealed" claim true.
- Failed sign-ins, OTP timeouts, RLS denials — all logged.

**AI Assistant:**
- All director-facing AI queries go through one endpoint: `POST /ai/ask`. Server-side orchestration only — never let the client construct prompts directly to Claude.
- Implement **two retrieval layers**:
  1. **Structured retrieval** — for questions like "rank LGAs by April rate", run typed SQL (parameterised, against a read-only replica role) and pass results to Claude as JSON context.
  2. **Semantic retrieval** — for questions about prior investigations, free-text decisions, etc., embed text fields with a cheap embedding model and retrieve top-K via pgvector.
- The model gets a strict system prompt that forbids fabricating numbers and requires it to cite which structured-retrieval result each claim comes from. Surface citations in the API response.
- Cache responses by hashed `(question, retrieval_results, role_scope)` for 1 hour to control cost.

**Notifications & messaging:**
- One internal "delivery" abstraction with adapters for `in_app`, `email` (Postmark/SES), `sms` (Termii or AWS SNS — Nigerian SMS support), `whatsapp` (Twilio).
- Every send produces a `delivery_attempt` record with provider message id, status, and (when available) a read receipt. Per-recipient acknowledgement is what the Director sees in the Communications screen.
- Quiet hours: 22:00–06:00 WAT — non-urgent broadcasts are queued.

**Multilingual & voice:**
- ASR is async. Mobile uploads the audio chunk + a local-only quick transcript hint; server runs the full Hausa-tuned model and returns the canonical transcript. The mobile app reconciles when online.
- All user-facing strings tagged for i18n. API responses include the locale they're in (`Content-Language` header). Validation errors localised.

### Performance & resilience targets

- p95 latency < 200ms for all read endpoints under 100 RPS, < 500ms for writes (excluding async OCR/ASR).
- Sync endpoint must accept and ack 50 operations per request in < 1s.
- All endpoints rate-limited per role and per device. Sliding-window in Redis.
- Circuit breakers around every external dependency (Anthropic API, Twilio, SES, Termii). Failures degrade gracefully — e.g. AI Assistant returns "data available, narrative unavailable" rather than erroring.
- Health checks: `/health/live` (process up) and `/health/ready` (DB + Redis + queues responsive). Kubernetes-friendly.
- Backups: daily PG base backup + WAL archiving with 30-day retention. Documented restore drill in `RUNBOOK.md`.

### Security posture (NDPR + ISO 27001-aligned)

- TLS 1.3 only at the edge.
- All PII (names, phones, voice recordings) encrypted at rest using **PostgreSQL `pgcrypto`** for column-level encryption of sensitive fields, application key wrapped by KMS.
- Phone numbers normalised (E.164) and stored hashed for lookup, with the plaintext encrypted separately for display.
- No personal data in logs. Use a redaction middleware. PII fields tagged in code with a `@Sensitive()` decorator and stripped from log payloads.
- Right-to-erasure workflow per NDPR: a documented procedure in `RUNBOOK.md` plus an admin-only endpoint that performs a soft-erasure (hashing identifiers in historical records while preserving aggregate statistics).
- Threat model in `THREATS.md` covering: stolen device → token theft, malicious coordinator exfiltration, prompt injection in voice transcripts, OCR-driven content injection, replay attacks on sync, audit-log tampering. For each, the implemented mitigation.

### Testing requirements

- **Unit tests** ≥ 80% line coverage for services and domain logic. Coverage gate enforced in CI.
- **Integration tests** — every endpoint has a happy-path + RLS-denial test, run against a real ephemeral Postgres (Testcontainers).
- **Contract tests** — OpenAPI snapshot in CI, breaking changes block merge.
- **Sync tests** — a property-based test (fast-check) that proves: same operations applied in any order yield the same canonical report state.
- **Load tests** — `k6` script in `tests/load/` for the sync, submissions, and AI endpoints. Run results published to `LOAD-TEST.md`.

### Deliverables (this is what "done" means)

```
backend/
├── ARCHITECTURE.md          # Stack rationale + module map + Mermaid diagrams + decisions log
├── THREATS.md               # Threat model with mitigations
├── RUNBOOK.md               # On-call procedures, restore drill, NDPR right-to-erasure procedure
├── LOAD-TEST.md             # Capacity numbers from real k6 runs
├── README.md                # Local-dev setup in <5 commands
├── docker-compose.yml       # Postgres + Redis + MinIO for local dev
├── Dockerfile               # Multi-stage, distroless, non-root
├── .github/workflows/       # CI: lint, typecheck, test, audit, scan, OpenAPI diff
├── drizzle/                 # Migrations (numbered, never edited after merge)
├── src/
│   ├── modules/             # One folder per bounded context
│   ├── common/              # Guards, interceptors, decorators (incl. @Sensitive, @Idempotent)
│   ├── infra/               # Postgres, Redis, S3, queue, KMS clients
│   └── main.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── property/            # CRDT/sync property tests
│   └── load/                # k6 scripts
└── openapi.yaml             # Generated, committed, diff-checked in CI
```

### How to proceed

Build incrementally and commit at each milestone. Write the migration before the service. Write the test before the endpoint. After each milestone, run the full test suite — do not move on with red.

**Milestone sequence:**

1. **Skeleton & infra** — Nest scaffold, Drizzle wired up, `docker-compose` for Postgres + Redis + MinIO, health endpoints, structured logging, request ID propagation. Commit.
2. **Schema & RLS** — every table, every RLS policy, every index. Seed script for 23 LGAs and 255 ward stubs. Run `database-schema-designer` to validate. Commit.
3. **Auth** — sign-in, refresh rotation, TOTP for directors, PIN flow for secretaries (Argon2id), 2FA, RBAC guards, RLS context-setter middleware. Commit.
4. **Users & onboarding** — coordinator and secretary CRUD, assignment flow, audit hooks. Commit.
5. **Forms & versioning** — form CRUD, versioning, scoping, deploy/archive transitions. Commit.
6. **Reports core** — draft → submitted → review → approved/returned → sealed state machine, with append-only history. Property tests pass. Commit.
7. **Sync** — `POST /sync/batch` with idempotency, cursor pull, conflict semantics. Commit.
8. **Voice & OCR pipelines** — async ASR + OCR jobs, artefact storage in S3, confidence scores stored. Commit.
9. **Investigations** — case CRUD, evidence attachments, activity timeline. Commit.
10. **Communications** — broadcast composer endpoint, per-channel adapters with circuit breakers, delivery + read tracking. Commit.
11. **Audit log** — hash-chained appends, daily anchor signing, sealed-CSV export. Commit.
12. **AI Assistant** — RAG pipeline (use the `rag-architect` skill), structured + semantic retrieval, citation enforcement, response cache. Commit.
13. **Observability & ops** — OpenTelemetry traces, Prometheus metrics, dashboards JSON, runbook, restore drill rehearsed. Commit.
14. **Hardening** — run `dependency-auditor` and `skill-security-auditor` against the codebase, address everything. Commit.

### Rules of engagement

- **Ask if a domain rule is ambiguous.** Don't guess. The Director's UI mocks I'll share are authoritative for what the API needs to support — match them.
- **Do not introduce a dependency without justifying it in `ARCHITECTURE.md`.** Every additional package is operational debt.
- **No mocks left in production code.** If something can't be built (e.g. real Twilio account), gate it behind an interface and stub the implementation in dev only — clearly marked.
- **When you finish a milestone, briefly summarise what you built, what you tested, and what you would build next if you had another day.** Then proceed.

Begin with milestone 1. Confirm the stack first, then start the skeleton.

---

## What you (the human) should hand Claude Code along with this prompt

1. The three walkthrough PDFs (Secretary, Coordinator, State) — they are the source of truth for what each role does and what the API needs to support.
2. The original user manual fragments showing manual screen numbering (`figure 12`, `figure 18`, etc.) — for traceability.
3. The list of 23 LGAs and ward names you intend to seed.
4. Any existing OpenAPI / data-model artefacts from a prior prototype, if they exist.
5. Production environment constraints you already know — e.g. "we have to deploy to Galaxy Backbone in Abuja" or "we get a managed Postgres from Provider X".

If any of (3)–(5) are unknown, Claude Code should stub them with realistic Kaduna data and call them out in `ARCHITECTURE.md` under "Assumptions to confirm".
