# Continuity addendum — making the prompt portable across coding agents

Append the section below to the original prompt. It adds a continuity contract so that when one agent (Claude Code) hits its session limit, another agent (Kimi, OpenCode, Aider, Cursor, plain GPT in a terminal) can resume the build with zero context loss.

The trick is: don't rely on the agent's memory. Persist state in the repo itself, in formats every agent can read.

---

## CONTINUITY ADDENDUM — append to the original prompt

This project must be **agent-portable**. At any point this build may be paused and resumed by a different coding agent (Claude Code, Kimi, OpenCode, Aider, Cursor, or a human). Every agent must be able to look at the repository alone — without prior conversation context — and know exactly what was done, what is in flight, and what to do next.

### Hard rules that apply to every agent

1. **The repo is the source of truth, not your conversation.** If a fact only lives in your chat memory, it does not exist. Persist it to the repo before ending any unit of work.

2. **Treat the install/setup steps in the original prompt as platform-specific suggestions, not requirements.** `/plugin marketplace add ...` is a Claude Code convenience; it is not a build dependency. The *content* of the referenced skills (schema design conventions, RAG patterns, observability checklists, etc.) is what matters — and that content must be summarised into the repo as `docs/conventions/` so future agents on platforms without that skill system get the same guidance.

3. **No tool-specific files in the source tree.** Do not commit `.claude/`, `.cursor/`, `.aider*`, `.kimi/`, `.opencode/`, or any other agent-private directories. Add them to `.gitignore`. The build must be reproducible by an agent that has never heard of any of these tools.

4. **Every external command you assume must be documented in `README.md` under "Required tooling"** — exact versions, install command, why it's needed. If an agent on a different platform can't install Node 20, the README tells them that's the blocker, not "Claude Code wasn't available".

### The continuity files (create these in milestone 1, maintain religiously)

Create a `.handoff/` directory at the repo root with these files. These are the contract between agents.

#### `.handoff/STATE.md`
The canonical "where are we" file. Update at the **end of every working session**, before the agent stops. Format:

```markdown
# Build state

**Last updated:** 2026-04-27 14:32 UTC by `claude-code` (session id: <opaque>)
**Current milestone:** 6 — Reports core
**Status:** in_progress

## What's done
- M1 Skeleton & infra ✅ (commit a3f2c91)
- M2 Schema & RLS ✅ (commit 8d4e1b2)
- M3 Auth ✅ (commit 1c5a907)
- M4 Users & onboarding ✅ (commit 4f8b2d3)
- M5 Forms & versioning ✅ (commit 7e9c0a4)

## What's in flight
- M6 Reports core (this milestone)
  - Migration `0006_reports.sql` written, applied, ✅
  - Service `ReportService.create()` written ✅, tested ✅
  - Service `ReportService.transition()` (state machine) — STARTED, transitions
    `draft → submitted` and `submitted → in_review` implemented & tested.
    NOT YET implemented: `in_review → approved`, `in_review → returned`, sealing.
  - Property test for append-only history — NOT STARTED

## Next concrete actions (resume here)
1. Implement `transition()` cases for `approved` and `returned` in
   `src/modules/reports/report.service.ts`. Mirror existing pattern.
2. Implement sealing job (`src/modules/reports/jobs/seal-after-grace.ts`).
   Grace period = 7 days post-approval, configurable via `REPORT_SEAL_GRACE_DAYS`.
3. Write property test `tests/property/report-history.spec.ts` using fast-check
   per the spec in `ARCHITECTURE.md` §6.
4. Run `pnpm test` — must be green before commit.
5. Update this STATE.md, then commit with `feat(reports): complete state machine`.

## Open questions / decisions deferred
- (Q) Should `sealed` reports be visible to the *original* secretary, or only to coordinators+? Awaiting user confirmation. Implementing as "secretary read-only post-seal" until told otherwise; documented in ARCHITECTURE.md §Assumptions.
- (Q) ASR provider — assumed Whisper-large-v3 self-hosted in dev, but production might use Hugging Face Inference Endpoints. Not on the critical path for M6.

## Blockers
- None.

## Do not touch
- `src/modules/forms/` — frozen at M5. Any changes need a new milestone.
- `drizzle/0001_*.sql` through `drizzle/0005_*.sql` — applied, immutable.
```

#### `.handoff/CHECKLIST.md`
Pass/fail gates per milestone. A fresh agent runs through this top to bottom; the first unchecked item is where they start. No prose, no ambiguity.

```markdown
# Milestone gates

Every milestone is "done" only when all its gates are ticked AND `pnpm verify` exits 0.

## M1 — Skeleton & infra
- [x] `docker-compose up -d` brings up postgres, redis, minio
- [x] `pnpm install` succeeds with no warnings
- [x] `pnpm dev` starts the API; `curl localhost:3000/health/live` returns 200
- [x] `pnpm test` runs (zero tests OK at this stage, must not error)
- [x] `pnpm lint` passes
- [x] Structured JSON logs to stdout with `request_id` field present
- [x] Commit tagged `m1-complete`

## M2 — Schema & RLS
- [x] All 14 tables created via numbered migrations under `drizzle/`
- [x] RLS enabled on every table holding user data
- [x] RLS denial test passes for each role × each table
- [x] Seed script populates 23 LGAs and 255 ward stubs
- [x] Commit tagged `m2-complete`

## M6 — Reports core (in progress)
- [x] Migration `0006_reports.sql` applied
- [x] `ReportService.create()` + tests
- [ ] `ReportService.transition()` covers all 6 transitions in the state machine
- [ ] Sealing job runs on schedule, idempotent
- [ ] Property test `report-history.spec.ts` passes with 1000 generated cases
- [ ] OpenAPI snapshot updated in `openapi.yaml`
- [ ] Coverage for `src/modules/reports/` ≥ 85%
- [ ] Commit tagged `m6-complete`

## M7–M14
... (filled in as you reach each milestone, never in advance)
```

#### `.handoff/CONVENTIONS.md`
The conventions you would have picked up from the Claude Code skills, distilled into platform-agnostic prose. This is what makes the prompt portable away from Claude Code. Sections:

- **Schema design** — naming, indexes, foreign keys, RLS pattern, migration discipline
- **API design** — REST resource naming, error shape, pagination, idempotency, OpenAPI
- **Testing** — what counts as unit / integration / property / load; coverage rules
- **Observability** — logging fields, trace propagation, metric naming
- **Security** — `@Sensitive()` decorator, redaction middleware, KMS key handling
- **Commits** — Conventional Commits, one logical change per commit, milestone tags
- **AI orchestration** — prompt template location, citation format, cache key shape

If you originally read these from Claude Code skills, restate them here in your own words. Subsequent agents read this file instead of installing those skills.

#### `.handoff/DECISIONS.md`
Append-only architecture decision log. One entry per decision. Format:

```markdown
## ADR-007 — Append-only report history (CRDT-style)
**Date:** 2026-04-26
**Status:** accepted
**Context:** Mobile clients submit edits offline. Multiple edits may arrive out
of order from the same device or from multiple devices.
**Decision:** Reports are projections over an append-only operation log keyed by
`(report_id, op_id)` with UUIDv7 op_ids. Server stamps `server_seq` on accept.
The canonical state is derived; raw operations are never deleted.
**Consequences:** No information loss; replays are deterministic; report content
is auditable; storage grows linearly with edit volume (acceptable given scale).
**Rejected alternatives:** Last-writer-wins (loses edits); 3-way merge (too
complex for free-text fields); CRDTs from a library like Yjs (overkill, ties us
to the library's text representation).
**Author:** claude-code (session 2026-04-26)
```

Every architectural choice the next agent might second-guess goes here. If a future agent disagrees, they add a new ADR that supersedes the old one — they do not edit the old one.

#### `.handoff/SESSION-LOG.md`
Append-only log. Each session writes one entry when it stops:

```markdown
## 2026-04-27 14:32 UTC — claude-code
**Worked on:** M6 Reports core
**Commits:** a3f2c91, 8d4e1b2, 1c5a907
**Tests:** 247 passing, 0 failing, coverage 84.2%
**Stopped because:** session token limit
**Handed off to:** next session — see STATE.md for resume point
**Notes for next agent:**
- Watch out for the BullMQ v5 type bug in `src/infra/queue.ts` line 42.
  Workaround in place, see comment.
- Consider extracting the state-machine transitions into a separate file
  if it grows beyond 200 lines.
```

### Resume protocol — what every new agent does first

When you (any agent) start working on this repo, **before writing any code**, you must:

1. Read `.handoff/STATE.md` — what's the current milestone and what's in flight?
2. Read `.handoff/CHECKLIST.md` — find the first unchecked box; that's your starting line.
3. Read the last 3 entries of `.handoff/SESSION-LOG.md` — what gotchas did the previous agents leave?
4. Run `git log --oneline -20` to see recent commits and confirm STATE.md matches reality.
5. Run `pnpm install && pnpm verify` — if this fails, your first job is to make it pass; do not start new work on a red build.
6. Read `.handoff/CONVENTIONS.md` and `.handoff/DECISIONS.md` — these encode the project's accumulated wisdom.
7. **Only now** start coding the next unchecked checklist item.

When you stop working (session limit, end of day, manual pause), **before your final message**:

1. Commit anything uncommitted with a clear message; never leave staged-but-uncommitted work.
2. Update `.handoff/STATE.md` so the "next concrete actions" list reads as if you wrote it for a stranger who has never seen this code.
3. Append an entry to `.handoff/SESSION-LOG.md`.
4. Run `pnpm verify` one last time. If red, fix it or **roll back the partial work to the last green state and document what you tried in SESSION-LOG.md**. Never hand over a broken build.
5. Push to the remote so the next agent can pull.

### `pnpm verify` — the single command that defines green

Add a script to `package.json`:

```json
{
  "scripts": {
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm openapi:check"
  }
}
```

This is the contract. If `pnpm verify` exits 0, the codebase is in a handoff-able state. If it exits non-zero, work is not done.

### Tool-specific notes (for agents picking this up)

- **Claude Code:** the original prompt's `/plugin install ...` lines work as-is. Use them.
- **Kimi (Moonshot Coder):** Kimi reads project files but has no plugin system. Open `.handoff/CONVENTIONS.md` first; it contains the substance of what those skills would have provided. Then follow the resume protocol above.
- **OpenCode:** treat `.handoff/STATE.md` as your task brief. OpenCode's planning mode tends to want to re-architect from scratch — resist that. The decisions in `.handoff/DECISIONS.md` are binding; new ADRs supersede old ones, they don't silently override.
- **Aider:** start with `aider .handoff/STATE.md .handoff/CHECKLIST.md` so it loads context before you ask for code.
- **Cursor / Windsurf:** the conventions live in `.handoff/CONVENTIONS.md`. If you want them surfaced to the editor's AI, also generate platform-specific shadow copies on demand (`./scripts/export-conventions.sh cursor`) — but don't commit those copies, they're derived.

### What this is NOT

- It is not a workflow tool. No issue tracker, no Kanban, no fancy state machine. Plain markdown files an agent can read in seconds.
- It is not version-controlled history of *what could go wrong* — it's a forward-looking handoff document. Postmortems live in `RUNBOOK.md`.
- It is not a substitute for good commit messages. If `.handoff/STATE.md` reads "see commits", that's a failure of STATE.md, not commits.

The whole continuity layer is roughly six markdown files and one npm script. The discipline of maintaining them is what makes the build resumable; the files themselves are trivial.
