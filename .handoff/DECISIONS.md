# Architecture Decision Log

Append-only. To change a decision, add a new ADR that supersedes the old one. Do not edit accepted ADRs.

---

## ADR-001 — Node 20 LTS in production, Node 24 acceptable in dev
**Date:** 2026-04-27
**Status:** accepted
**Context:** The original prompt mandates Node 20 LTS. The dev machine ships with Node 24.13.0. Forcing Node 20 install via nvm-windows is friction; allowing Node 24 silently is a runtime divergence.
**Decision:** Pin **Node 20** in `Dockerfile`, `.nvmrc`, `package.json` `engines.node`, and CI matrix. Allow Node 22+ in dev but warn on `pnpm install` if `process.versions.node` is outside the `engines` range. CI is the canonical green check.
**Consequences:** Developers on Node 22+ may hit dep/typing surprises that don't show up in CI. Mitigated by `pnpm verify` running on the engines-pinned Node when triggered locally via Docker (`pnpm verify:docker`).
**Rejected alternatives:**
- "Just use Node 24 everywhere" — silently violates the prompt's explicit constraint.
- "Block dev without Node 20" — high friction; nvm-windows is not zero-cost.
**Author:** claude-code (session 2026-04-27)

---

## ADR-002 — Stack confirmation: NestJS 10 + Drizzle + Postgres 16 + Redis 7 + MinIO + pgvector
**Date:** 2026-04-27
**Status:** accepted
**Context:** The prompt mandates a specific stack. No reason to deviate.
**Decision:** Confirmed:
- **Runtime:** Node 20 LTS, TypeScript ≥ 5.4, NestJS 10.x.
- **DB:** Postgres 16 (Alpine in dev). Drizzle ORM (not TypeORM) for migrations and queries. `pgvector`, `pgcrypto`, `pg_trgm` extensions enabled.
- **Cache + queue:** Redis 7 (Alpine). BullMQ for jobs.
- **Object storage:** MinIO in dev (S3-compatible API). AWS S3 (or S3-compatible like Cloudflare R2 / Wasabi) in prod.
- **Search & embeddings:** pgvector on the same Postgres instance — no separate vector DB.
- **Auth:** JWT (RS256), Argon2id PINs.
- **Logging:** pino → stdout JSON. OpenTelemetry traces. Prometheus `/metrics`.
- **Containers:** multi-stage Dockerfile, `gcr.io/distroless/nodejs20-debian12` runtime, non-root user, read-only root FS at runtime via Kubernetes/compose flags.
**Consequences:** Single Postgres instance is the system of record AND the vector store AND the cache for transactional queries. Operational simplicity at the cost of "if Postgres is down, everything is down" — acceptable given scale (one state, ~3000 active users).
**Rejected alternatives:**
- TypeORM (rejected by prompt — fragile migrations).
- Pinecone/Weaviate (rejected — extra system, extra failure mode, no benefit at this scale).
- Express/Fastify directly (rejected — NestJS modular structure matches the bounded-context list cleanly).
**Author:** claude-code (session 2026-04-27)

---

## ADR-003 — `.handoff/` continuity layer in repo root
**Date:** 2026-04-27
**Status:** accepted
**Context:** The Continuity Addendum mandates a portable handoff format so any coding agent (Claude Code, Kimi, OpenCode, Aider, Cursor, human) can resume the build with zero context loss.
**Decision:** Adopt the addendum verbatim:
- `.handoff/STATE.md` — current "where are we" (mutable, updated each session).
- `.handoff/CHECKLIST.md` — milestone gates (mutable, ticking boxes only).
- `.handoff/CONVENTIONS.md` — distilled standards (mostly stable; updated when conventions evolve).
- `.handoff/DECISIONS.md` — append-only ADR log (this file).
- `.handoff/SESSION-LOG.md` — append-only per-session entries.
- `pnpm verify` is the single green-light contract.
**Consequences:** Every session pays a small "handoff tax" (~2-5 min at session end) in exchange for resumability across agents and weeks. Worth it for a 14-milestone build.
**Rejected alternatives:** GitHub issues / project board (tool-specific, not portable). Per-agent metadata files (forbidden by addendum).
**Author:** claude-code (session 2026-04-27)

---

## ADR-004 — Repo root is `DigiWDC/`; spec docs live at `docs/spec/`
**Date:** 2026-04-27
**Status:** accepted
**Context:** The prompt's deliverable tree shows `backend/` as the root. The working dir is `DigiWDC/` containing only the two spec markdowns. Two reasonable interpretations: (a) `DigiWDC/` is the repo, or (b) `DigiWDC/backend/` is the repo nested in a workspace.
**Decision:** `DigiWDC/` **is** the repo root. Spec docs moved to `docs/spec/`. All code lives at `src/`, migrations at `drizzle/`, etc.
**Consequences:** Simpler paths; matches the addendum's "repo root" language. If a separate frontend repo joins later, it sits beside this one (`../DigiWDC-frontend/`), not inside it.
**Rejected alternatives:** `backend/` subdir — extra level of nesting with no current value.
**Author:** claude-code (session 2026-04-27)

---

## ADR-005 — Local dev ports avoid 3000/5432/6379/9000 conflicts; force IPv4
**Date:** 2026-04-27
**Status:** accepted
**Context:** The dev machine already runs `jazet_postgres` on 5432 and `jazet_redis` on 6379 from another project, and a Next.js + Clerk dev server on port 3000. Empirically, `localhost` resolves to IPv6 (`::1`) first on Windows, which (a) routed `curl localhost:3000` to the wrong app even when ours bound IPv4, and (b) caused Node clients to take a flaky path through Docker Desktop's WSL relay that surfaced as `ECONNRESET` storms against Redis on `localhost:6380`.
**Decision:** docker-compose uses **5433** (postgres), **6380** (redis), **9100/9101** (minio API/console). API listens on **3100**. `.env.example` and `.env.local` use **`127.0.0.1`** rather than `localhost` for every local URL — forces IPv4 and avoids the IPv6/WSL relay weirdness.
**Consequences:** Mild deviation from "default port" expectations. CI uses default ports inside its container network anyway. Documented in `README.md` and `.env.example`.
**Rejected alternatives:** Stop the other containers / kill the Clerk dev server — not our containers/processes to stop. Disable IPv6 globally — too invasive for one project's needs.
**Author:** claude-code (session 2026-04-27)
