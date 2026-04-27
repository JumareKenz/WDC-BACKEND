# `.handoff/` — read this first

You are an agent (or human) picking up a build that another agent started. The repo is the source of truth, not your conversation memory. Five files, in this order:

1. **`STATE.md`** — where we are, what's in flight, what to do next.
2. **`CHECKLIST.md`** — milestone gates. Find the first unchecked box; that's your starting line.
3. **`SESSION-LOG.md`** — last 3 entries; pick up gotchas from previous sessions.
4. **`CONVENTIONS.md`** — the standards you must follow (the substance of what the original prompt's Claude-Code-specific skills would have provided, restated in platform-agnostic prose).
5. **`DECISIONS.md`** — append-only ADR log. Read; don't edit. Disagree? Add a new ADR superseding the old.

## Resume protocol (do this before writing any code)

```
1. Read STATE.md.
2. Read CHECKLIST.md → find first unchecked → that's your task.
3. Read last 3 entries of SESSION-LOG.md.
4. git log --oneline -20  (confirm STATE.md matches reality)
5. cp .env.example .env.local  (if not already done)
6. docker compose up -d  (postgres / redis / minio)
7. pnpm install
8. pnpm verify    # MUST exit 0 before you start new work
9. Read CONVENTIONS.md and DECISIONS.md.
10. Now work on the first unchecked checklist item.
```

## Stop protocol (do this before your final message)

```
1. git add -A && git commit -m "..."   (Conventional Commits; never hand off staged-but-uncommitted)
2. Edit STATE.md → "next concrete actions" reads as if for a stranger.
3. Append a new entry to SESSION-LOG.md (timestamp, work, commits, gotchas).
4. pnpm verify     # MUST be green; if red, fix or roll back to last green.
5. (If remote configured) git push.
```

## Don'ts

- Don't commit `.claude/`, `.cursor/`, `.aider*`, `.kimi/`, `.opencode/`, `.windsurf/` — `.gitignore` already excludes them. If you see one, your editor leaked it.
- Don't edit accepted ADRs. Supersede with a new one.
- Don't relax `pnpm verify` to make it pass. Fix the underlying issue.
- Don't add a dependency without justifying it in `CONVENTIONS.md` or a new ADR.
