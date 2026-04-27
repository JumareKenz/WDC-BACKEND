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
