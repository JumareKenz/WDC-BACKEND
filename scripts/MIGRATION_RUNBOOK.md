# MVP → New Backend Migration Runbook

## Prerequisites

1. **New database running** on `localhost:5433` with all schema migrations applied:
   ```bash
   DATABASE_URL="postgresql://wdc:wdc@localhost:5433/wdc" pnpm drizzle:migrate
   ```

2. **must_reset_password column added** (migration 0009):
   Ensure `drizzle/0009_must_reset_password.sql` has been applied. If the `must_reset_password`
   column doesn't exist, the user migration will fail.

3. **MVP database accessible** from your machine (port 5432 on 64.23.131.118).

4. **Environment variable** ready:
   ```bash
   export MVP_DB_PASSWORD="<the password>"
   ```

---

## Step-by-Step Execution

### Step 1: Apply schema migrations

```bash
DATABASE_URL="postgresql://wdc:wdc@localhost:5433/wdc" pnpm drizzle:migrate
```

Verify 0009 was applied:
```
skip 0001_init.sql (already applied)
...
apply 0009_must_reset_password.sql ... ok
```

### Step 2: Run the data migration

```bash
MVP_DB_PASSWORD=<password> pnpm migrate:mvp
```

Expected output:
```
=== MVP Data Migration ===

Migrating lgas... 23 inserted, 0 skipped, 0 errors
Migrating wards... 255 inserted, 0 skipped, 0 errors
Migrating users... ~275 inserted, N skipped (duplicates), 0 errors
Migrating form_definitions... 2 inserted, 0 skipped, 0 errors
Migrating reports... 25 inserted, 0 skipped, 0 errors
Migrating voice_notes... 24 inserted, 0 skipped, 0 errors
Migrating notifications... 50 inserted, 0 skipped, 0 errors
Migrating investigation_notes... 3 inserted, 0 skipped, 0 errors
```

The script is **idempotent** — safe to run multiple times. Existing records are skipped.

### Step 3: Verify counts

```bash
MVP_DB_PASSWORD=<password> pnpm verify:migration
```

All tables should show PASS or WARN (WARN is expected for users due to duplicate phone skips).

### Step 4: Flag issues

```bash
pnpm flag:migration
```

Review `migration_issues_report.txt`. Fix any BROKEN foreign keys before proceeding.

---

## Critical Post-Migration Actions

### ⚠ BEFORE PRODUCTION CUTOVER

These MUST be completed before serving live traffic:

1. **Re-encrypt PII records**
   All users with `key_id = 'mvp_plaintext_migration'` have plaintext PII stored as raw
   buffers. Run the application's encryption routine against every such record:
   ```sql
   SELECT id FROM users WHERE key_id = 'mvp_plaintext_migration';
   ```
   After re-encryption, update `key_id` to the real KMS key identifier.

2. **Password migration flow**
   All migrated users have `must_reset_password = true` and their bcrypt hash is stored
   as `$bcrypt$<hash>` in `password_hash`. The auth layer must:
   - Detect the `$bcrypt$` prefix
   - Verify against bcrypt on first login
   - Force a password reset to generate an Argon2 hash
   - Clear `must_reset_password` flag

3. **Verify FK integrity**
   Zero orphaned records should remain. If any exist, resolve manually:
   - Missing ward/LGA references → check if the MVP ward IDs existed
   - Missing user references → user may have been skipped due to duplicate phone

---

## Rollback

The migration only INSERTs. To roll back:
```sql
-- Nuclear option: clear all migrated data
DELETE FROM delivery_attempts WHERE id IN (SELECT ... where migrated);
DELETE FROM attachments WHERE id IN (...);
DELETE FROM reports WHERE id IN (...);
DELETE FROM investigations WHERE id IN (...);
DELETE FROM form_versions WHERE id IN (...);
DELETE FROM forms WHERE id IN (...);
DELETE FROM users WHERE key_id = 'mvp_plaintext_migration';
DELETE FROM wards WHERE id IN (...);
DELETE FROM lgas WHERE id IN (...);
```

Since UUIDs are deterministic, you can regenerate the list of migrated IDs at any time by
re-running the uuid5 generation against the MVP integer IDs.

---

## Table Migration Order (dependency graph)

```
lgas
 └─ wards
     └─ users (depends on lgas + wards)
         ├─ form_definitions → forms + form_versions (depends on users)
         │   └─ reports (depends on wards + users + form_versions)
         │       └─ voice_notes → attachments (depends on reports + users)
         ├─ notifications → delivery_attempts (depends on users)
         └─ investigation_notes → investigations (depends on users)
```

---

## Skipped Tables

| MVP Table | Reason |
|---|---|
| feedback | 0 rows — empty table |
| chat_sessions | AI chat history — no equivalent in new schema |
| chat_messages | AI chat history — ephemeral, not needed |

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `must_reset_password` column missing | 0009 migration not applied | Run `pnpm drizzle:migrate` |
| Phone hash unique constraint violation | Duplicate phones in MVP | Script auto-skips; check logs |
| FK violation on reports.form_version_id | form_definitions not migrated first | Script runs in dependency order |
| Connection refused to MVP | Network/firewall | Verify port 5432 is accessible |
| All users skipped | Re-run on populated DB | Expected on 2nd run (idempotent) |
