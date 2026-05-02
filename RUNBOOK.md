# Runbook — WDC Backend

On-call procedures, restore drills, and NDPR right-to-erasure. Sections are filled in as the milestones reach them; until then they are stubbed with the *intent* of the procedure so on-call has somewhere to start.

---

## 1. On-call basics

- **Pager:** TBD (M13).
- **Dashboards:** Grafana dashboard JSON at `dashboards/wdc-backend.json` (import into Grafana).
- **Metrics endpoint:** `/health/metrics` returns Prometheus-format metrics.
- **Health probes:** `/health/live` (process up), `/health/ready` (Postgres + Redis up), `/health/metrics` (Prometheus scrape).

### 1.1 First five minutes of an incident

1. Confirm scope: `/health/ready` from outside; `kubectl get pods -n wdc`; check Grafana "API overview" board.
2. Capture current state: `kubectl logs -n wdc -l app=wdc-backend --tail=500 > /tmp/wdc-incident-$(date +%s).log`.
3. Page the on-call DBA if Postgres or Redis is implicated.
4. Open an incident channel; link the captured logs and the run of `/health/ready`.
5. **Don't panic-restart.** A NestJS pod restart loses request-id correlation; capture first.

---

## 2. Restore drill (Postgres)

> **Stub — finalised in M13.** This procedure runs as a quarterly fire drill in production and as part of CI for migrations.

### 2.1 Backups

- Daily base backup via `pg_basebackup`; WAL archiving to S3 with 30-day retention.
- Backups are encrypted at rest with the same KMS key as the column-level encryption (different DEK).

### 2.2 Restore procedure

1. Provision a fresh Postgres 16 instance with `pgvector`, `pgcrypto`, `pg_trgm` (`drizzle/init/01_extensions.sql`).
2. Restore the latest base backup: `pg_basebackup --target=/var/lib/postgresql/data ...`.
3. Replay WAL up to the desired LSN: `pg_ctl start -o '-c recovery_target_time=...'`.
4. Run `SELECT pg_is_in_recovery();` — must be `f` before traffic is routed.
5. Smoke test: `curl /health/ready` → 200; `curl /api/v1/wards` → 200.
6. Cut DNS to the restored instance.

### 2.3 RPO / RTO targets

- RPO ≤ 15 min (WAL ship interval).
- RTO ≤ 60 min from page to traffic-cut.

---

## 3. NDPR right-to-erasure

> **Stub — finalised in M14.**

A data-subject request follows this procedure:

1. **Verify identity** out-of-band (phone callback to the registered number; not via email).
2. **Open a ticket** with the subject's `phone_hash` (never plaintext PII in the ticket).
3. **Director with TOTP** invokes `POST /admin/erasure` with the ticket id and a 2-of-3 director-approval token.
4. The endpoint runs a soft-erasure transaction:
   - For each `personal_data` row, replace name, phone ciphertext, and email with deterministic hashes derived from `subject_id`.
   - Keep aggregates (counts, latencies, role decisions) intact.
   - Append an `audit_event` of kind `pii.erasure` with the ticket id.
5. The `audit_event` chain extends as normal; the daily anchor signs it.
6. Notify the subject via the original verification channel.

### 3.1 What is *not* erased

- Audit-log content itself (hash-chain integrity).
- Aggregate statistics in `report_summary` materialised views.
- Court-ordered retention windows override erasure (out-of-scope for the system; NDPR §38(b) carve-out).

---

## 4. Key rotation

> **Stub — finalised in M13.**

- **JWT signing keys (RS256):** rotate quarterly. Old key remains as `previous_jwt_public_key` until all refresh tokens have expired (max 7 days). Document timestamp in `.handoff/DECISIONS.md`.
- **Column-level DEKs:** rotate yearly. Re-encrypt in the background via the `crypto.rotate` queue; `key_id` column tracks which DEK encrypted each row.
- **Argon2 pepper:** **never** rotated in place — would invalidate every PIN. If compromise is confirmed, force-reset all PINs on next sign-in (procedure: M14).

---

## 5. Common runtime issues

> Filled in as we encounter them. Each entry has: symptom → diagnosis → fix.

### 5.1 Stub: Redis connection refused

**Symptom:** `/health/ready` returns 503 with `redis: down`.

**Diagnosis:** `redis-cli -p 6380 ping` from the host. If `Could not connect`, the Redis container is down or the port mapping is wrong.

**Fix:** `docker compose up -d redis` to bring it back; check `docker compose logs redis` for crash cause.

---

## 6. Postmortems

Postmortems live under `ops/postmortems/YYYY-MM-DD-<slug>.md`. Format follows Google SRE.

- Title, date, severity (SEV1–4).
- Timeline.
- Impact (users affected, duration, data lost if any).
- Root cause.
- What went well.
- What we'll change (linked to commits / PRs).

The continuity addendum says postmortems live here — **not** in `.handoff/`.
