# MVP → New Schema Migration Mapping

## Overview

- **MVP DB**: PostgreSQL on 64.23.131.118:5432 (`wdc_app_db`) — integer PKs, plain-text PII
- **New DB**: PostgreSQL on localhost:5433 (`wdc`) — UUID PKs, encrypted PII, Drizzle ORM

### ID Strategy

All MVP integer PKs will be converted to deterministic UUIDs using:
```
uuid5(NAMESPACE, 'mvp_{table}_{id}')
```
Where NAMESPACE = `6ba7b810-9dad-11d1-80b4-00c04fd430c8` (DNS namespace, fixed).

---

## Table Mappings

### 1. `lgas` → `lgas`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| name | varchar(100) | name | text | Direct copy |
| code | varchar(20) | code | text | Direct copy |
| population | integer | — | — | **DROPPED** (no equivalent column) |
| num_wards | integer | — | — | **DROPPED** (derivable from wards count) |
| created_at | timestamptz | created_at | timestamptz | Direct copy |
| — | — | name_ha | text | **DEFAULT**: copy `name` value (Hausa name not in MVP) |
| — | — | updated_at | timestamptz | **DEFAULT**: use `created_at` value |

### 2. `wards` → `wards`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| lga_id | integer | lga_id | uuid | uuid5('mvp_lgas_{lga_id}') |
| name | varchar(100) | name | text | Direct copy |
| code | varchar(20) | code | text | Direct copy |
| population | integer | — | — | **DROPPED** |
| created_at | timestamptz | created_at | timestamptz | Direct copy |
| — | — | name_ha | text | **DEFAULT**: copy `name` value |
| — | — | updated_at | timestamptz | **DEFAULT**: use `created_at` value |

### 3. `users` → `users`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| email | varchar(255) | email_hash / email_ciphertext | bytea | Encrypt email; store hash for lookup |
| password_hash | varchar(255) | password_hash | text | **SPECIAL**: see password handling below |
| full_name | varchar(150) | full_name_ciphertext | bytea | Encrypt full_name |
| phone | varchar(20) | phone_hash / phone_ciphertext | bytea | Encrypt phone; store hash for lookup |
| role | varchar(50) | role | text | **ENUM MAP** (see below) |
| ward_id | integer | ward_id | uuid | uuid5('mvp_wards_{ward_id}') or NULL |
| lga_id | integer | lga_id | uuid | uuid5('mvp_lgas_{lga_id}') or NULL |
| is_active | boolean | status | text | `true` → 'active', `false` → 'suspended' |
| created_at | timestamptz | created_at | timestamptz | Direct copy |
| last_login | timestamptz | — | — | **DROPPED** (no equivalent) |
| pin_hash | varchar(255) | pin_hash | text | Direct copy (both are bcrypt) |
| — | — | key_id | text | **DEFAULT**: 'mvp_migration_v1' (placeholder) |
| — | — | updated_at | timestamptz | **DEFAULT**: use `created_at` value |

**Role Mapping:**
| MVP Role | New Role |
|---|---|
| WDC_SECRETARY | secretary |
| LGA_COORDINATOR | coordinator |
| STATE_OFFICIAL | director |

**Password Handling:**
- MVP uses bcrypt hashes
- New schema uses Argon2 (`password_hash` column)
- Migration will:
  1. Store bcrypt hash as the `password_hash` value prefixed with `$bcrypt$` so the auth layer can detect legacy hashes
  2. Note: there is no dedicated `legacy_password_hash` column in the new schema, so we store a recognizable sentinel in `password_hash`
  3. A separate password-reset flow should be triggered for migrated users

**Encryption Handling:**
- Since the migration script cannot generate real encrypted ciphertexts without the application's encryption keys, it will store **plaintext values encoded as UTF-8 buffers** with `key_id = 'mvp_plaintext_migration'`
- The application must re-encrypt these records using its real KMS key before going to production
- Alternatively: the migration generates placeholder ciphertext and users must re-verify their identity

### 4. `reports` → `reports`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| ward_id | integer | ward_id | uuid | uuid5('mvp_wards_{ward_id}') |
| user_id | integer | submitted_by | uuid | uuid5('mvp_users_{user_id}') |
| status | varchar(20) | state | text | **ENUM MAP** (see below) |
| submitted_at | timestamptz | created_at | timestamptz | Direct copy |
| — | — | form_version_id | uuid | **REQUIRED**: linked to migrated form_definitions |
| — | — | submission_method | text | **DEFAULT**: 'wizard' (MVP was all web-form) |
| — | — | canonical | jsonb | **GENERATED**: all report data columns packed into JSON |
| — | — | updated_at | timestamptz | **DEFAULT**: use `submitted_at` |

**Status Mapping:**
| MVP Status | New State |
|---|---|
| SUBMITTED | submitted |
| REVIEWED | in_review |
| FLAGGED | in_review |
| DECLINED | returned |
| APPROVED | approved |

**Report Data → `canonical` JSONB:**
All 80+ data columns (health metrics, agenda items, attendance, facilities, etc.) will be serialized into the `canonical` JSONB field as a flat key-value object, preserving the original column names as keys. Example:
```json
{
  "report_month": "2024-03",
  "meeting_type": "monthly",
  "health_penta1": 45,
  "attendance_total": 12,
  ...
}
```

**Columns packed into `canonical`:**
- report_month, report_date, report_time, meeting_type
- All agenda_* booleans
- action_tracker, meetings_held, attendees_count
- issues_identified, actions_taken, challenges, recommendations, additional_notes
- All health_* columns
- All facilities_* columns
- All items_* columns
- All women_transported_*, children_transported_*, women_supported_*
- maternal_deaths, perinatal_deaths, maternal_death_causes, perinatal_death_causes
- town_hall_conducted, community_feedback, vdc_reports
- awareness_theme, awareness_topic
- traditional_leaders_support, religious_leaders_support
- action_plan, support_required, aob
- All attendance_* columns, next_meeting_date
- chairman_signature, secretary_signature
- custom_fields, group_photo_path, attendance_photo_url
- submission_id, decline_reason
- reviewed_by (as uuid5 reference), reviewed_at

### 5. `voice_notes` → `attachments`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| report_id | integer | report_id | uuid | uuid5('mvp_reports_{report_id}') |
| file_name | varchar(255) | storage_key | text | Use file_path as storage key |
| file_path | varchar(500) | storage_key | text | Full path as storage reference |
| file_size | integer | bytes | bigint | Direct copy |
| duration_seconds | integer | — | — | Stored in `processing_meta` |
| field_name | varchar(100) | — | — | Stored in `processing_meta` |
| transcription_status | varchar(20) | processing_state | text | **ENUM MAP** below |
| transcription_text | text | transcript | text | Direct copy |
| transcribed_at | timestamptz | — | — | Stored in `processing_meta` |
| uploaded_at | timestamptz | created_at | timestamptz | Direct copy |
| — | — | kind | text | **DEFAULT**: 'audio' |
| — | — | mime_type | text | **DEFAULT**: 'audio/webm' (infer from extension if possible) |
| — | — | uploaded_by | uuid | **DERIVED**: from report's user_id |
| — | — | confidence | numeric(4,3) | **DEFAULT**: NULL |
| — | — | processing_meta | jsonb | Holds duration_seconds, field_name, transcribed_at |
| — | — | updated_at | timestamptz | **DEFAULT**: use uploaded_at |

**Transcription Status Mapping:**
| MVP Status | New processing_state |
|---|---|
| DONE | done |
| FAILED | failed |
| PENDING | pending |
| IN_PROGRESS | processing |
| NULL | pending |

### 6. `notifications` → `delivery_attempts`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| recipient_id | integer | recipient_user_id | uuid | uuid5('mvp_users_{recipient_id}') |
| sender_id | integer | — | — | Stored in `payload` |
| notification_type | varchar(50) | — | — | Stored in `payload` |
| title | varchar(200) | — | — | Stored in `payload` |
| message | text | — | — | Stored in `payload` |
| related_entity_type | varchar(50) | — | — | Stored in `payload` |
| related_entity_id | integer | — | — | Stored in `payload` |
| is_read | boolean | status | text | `true` → 'read', `false` → 'delivered' |
| created_at | timestamptz | queued_at | timestamptz | Direct copy |
| — | — | channel | text | **DEFAULT**: 'in_app' |
| — | — | payload | jsonb | Contains title, message, type, sender, entity refs |

### 7. `feedback` → No direct equivalent

The MVP `feedback` table (0 rows) has no direct equivalent in the new schema. The closest matches are:
- `messages` table (encrypted messaging) — but different purpose
- Could be stored as investigation evidence notes

**Decision**: Skip migration (0 rows). Document for future reference.

### 8. `investigation_notes` → `investigations`

| MVP Column | Type | New Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| created_by | integer | opened_by | uuid | uuid5('mvp_users_{created_by}') |
| title | varchar(200) | title | text | Direct copy |
| description | text | summary | text | Direct copy |
| investigation_type | varchar(50) | — | — | Stored in metadata (no column in new schema) |
| priority | varchar(20) | priority | text | **ENUM MAP** below |
| status | varchar(20) | status | text | **ENUM MAP** below |
| ward_id | integer | — | — | Can be linked via investigation_evidence |
| lga_id | integer | — | — | Can be linked via investigation_evidence |
| created_at | timestamptz | created_at | timestamptz | Direct copy |
| updated_at | timestamptz | updated_at | timestamptz | Direct copy |
| closed_at | timestamptz | closed_at | timestamptz | Direct copy |

**Status Mapping:**
| MVP Status | New Status |
|---|---|
| OPEN | open |
| IN_PROGRESS | in_progress |
| CLOSED | closed |
| RESOLVED | resolved |

**Priority Mapping:**
| MVP Priority | New Priority |
|---|---|
| LOW | low |
| MEDIUM | normal |
| HIGH | high |
| URGENT | urgent |

### 9. `form_definitions` → `forms` + `form_versions`

| MVP Column | Type | → forms Column | Type | Notes |
|---|---|---|---|---|
| id | integer | id | uuid | uuid5 conversion |
| name | varchar(200) | title | text | Direct copy |
| — | — | title_ha | text | **DEFAULT**: copy `name` |
| — | — | slug | text | **GENERATED**: slugify(name) |
| description | text | — | — | Stored in form_versions.schema metadata |
| version | integer | — | — | Used for form_versions.version_number |
| status | varchar(20) | status | text | **ENUM MAP**: same values (lowercase) |
| definition | text | — | — | Parsed into form_versions.schema (jsonb) |
| created_by | integer | created_by | uuid | uuid5('mvp_users_{created_by}') |
| created_at | timestamptz | created_at | timestamptz | Direct copy |
| updated_at | timestamptz | updated_at | timestamptz | Direct copy |
| deployed_at | timestamptz | — | — | Used in form_versions.deployed_at |
| — | — | scope_kind | text | **DEFAULT**: 'state' |
| — | — | scope_ids | jsonb | **DEFAULT**: '[]' |
| — | — | current_version_id | uuid | Points to created form_version |

**Also creates `form_versions` row:**
| Source | → form_versions Column | Notes |
|---|---|---|
| form id | form_id | uuid5('mvp_form_definitions_{id}') |
| — | id | uuid5('mvp_form_version_{form_id}_{version}') |
| version | version_number | Direct copy (default 1 if NULL) |
| definition | schema | Parse text as JSON or wrap as `{"raw": definition}` |
| deployed_at | deployed_at | Direct copy |
| created_by | deployed_by | uuid5('mvp_users_{created_by}') |
| created_at | created_at | Direct copy |

### 10. `chat_sessions` / `chat_messages` → Not migrated

These AI chat history tables have no equivalent in the new schema. The new schema's `messages` table is for user-to-user encrypted messaging, not AI chat.

**Decision**: Skip migration. Chat history is ephemeral and not critical for the new system.

---

## Summary of Decisions

| Category | Decision |
|---|---|
| **IDs** | Integer → deterministic UUID5 |
| **Passwords** | Bcrypt hash stored with `$bcrypt$` prefix in password_hash; users must reset |
| **Encrypted PII** | Plaintext stored as Buffer with key_id='mvp_plaintext_migration'; must be re-encrypted before production |
| **Report data** | 80+ columns → `canonical` JSONB blob |
| **Notifications** | → `delivery_attempts` with metadata in `payload` JSONB |
| **Feedback** | Skipped (0 rows) |
| **Chat** | Skipped (non-critical ephemeral data) |
| **Hausa names** | Default to English name (can be updated later) |
| **form_definitions** | Split into `forms` + `form_versions` (1:1 initially) |

---

## Row Counts (as of introspection)

| MVP Table | Rows | Target Table | Migrated? |
|---|---|---|---|
| lgas | 23 | lgas | Yes |
| wards | 255 | wards | Yes |
| users | 275 | users | Yes |
| reports | 25 | reports | Yes |
| voice_notes | 24 | attachments | Yes |
| notifications | 50 | delivery_attempts | Yes |
| feedback | 0 | — | Skipped |
| investigation_notes | 3 | investigations | Yes |
| form_definitions | 2 | forms + form_versions | Yes |
| chat_sessions | 25 | — | Skipped |
| chat_messages | 52 | — | Skipped |

---

## Known Issues & Risks

1. **Encryption**: The new schema requires encrypted PII (bytea columns). The migration script cannot access the application's KMS keys. Solution: store plaintext as buffers with a special `key_id` marker.

2. **form_version_id on reports**: Every report requires a `form_version_id`. If form_definitions are not yet migrated or reports don't clearly map to a form, we need a "default migration form" as a catch-all.

3. **Phone uniqueness**: The new schema has a unique index on `phone_hash`. MVP users with NULL or duplicate phones will conflict.

4. **No `reviewed_by` FK in new reports**: The MVP `reviewed_by` column has no direct FK in the new schema. It will be stored in the `canonical` JSONB.

5. **Submission method**: All MVP reports will be marked as 'wizard' since they came through the web form interface.
