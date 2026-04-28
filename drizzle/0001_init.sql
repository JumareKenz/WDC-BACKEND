-- 0001_init.sql — canonical schema for the WDC backend.
--
-- Authoritative file. Drizzle TS schemas under src/infra/postgres/schema/ are
-- a typed mirror used for queries; SQL here is what runs in the database.
-- Numbered, immutable post-merge — fix bad migrations by adding a new one.

BEGIN;

-- Extensions are bootstrapped by drizzle/init/01_extensions.sql on first DB
-- creation, but re-declare them here as no-ops so a fresh DB created by any
-- means (test container, restore drill) is still complete.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- updated_at trigger fn — applied to every table that has updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wdc_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

-- ---------------------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------------------

CREATE TABLE lgas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  name        text NOT NULL,
  name_ha     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lgas_code_uk ON lgas (code);
CREATE TRIGGER lgas_set_updated_at BEFORE UPDATE ON lgas
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

CREATE TABLE wards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lga_id      uuid NOT NULL REFERENCES lgas(id) ON DELETE RESTRICT,
  code        text NOT NULL,
  name        text NOT NULL,
  name_ha     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wards_lga_id_idx ON wards (lga_id);
CREATE UNIQUE INDEX wards_lga_code_uk ON wards (lga_id, code);
CREATE TRIGGER wards_set_updated_at BEFORE UPDATE ON wards
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

-- ---------------------------------------------------------------------------
-- Users + refresh tokens
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role                     text NOT NULL CHECK (role IN ('secretary','coordinator','director','system')),
  lga_id                   uuid REFERENCES lgas(id) ON DELETE RESTRICT,
  ward_id                  uuid REFERENCES wards(id) ON DELETE RESTRICT,
  full_name_ciphertext     bytea NOT NULL,
  phone_hash               bytea NOT NULL,
  phone_ciphertext         bytea NOT NULL,
  email_hash               bytea,
  email_ciphertext         bytea,
  pin_hash                 text,
  password_hash            text,
  totp_secret_ciphertext   bytea,
  key_id                   text NOT NULL,
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  deleted_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_phone_hash_uk ON users (phone_hash);
CREATE INDEX users_lga_id_idx ON users (lga_id);
CREATE INDEX users_ward_id_idx ON users (ward_id);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

CREATE TABLE refresh_tokens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id         text NOT NULL,
  token_hash        text NOT NULL,
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  rotated_from_id   uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX refresh_tokens_token_hash_uk ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Forms + immutable versions
-- ---------------------------------------------------------------------------

CREATE TABLE forms (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL,
  title               text NOT NULL,
  title_ha            text NOT NULL,
  scope_kind          text NOT NULL CHECK (scope_kind IN ('state','lga','ward')),
  scope_ids           jsonb NOT NULL DEFAULT '[]'::jsonb,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','deployed','archived')),
  current_version_id  uuid,
  created_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX forms_slug_uk ON forms (slug);
CREATE TRIGGER forms_set_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

CREATE TABLE form_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  version_number  integer NOT NULL,
  schema          jsonb NOT NULL,
  deployed_at     timestamptz,
  deployed_by     uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX form_versions_form_version_uk ON form_versions (form_id, version_number);
CREATE INDEX form_versions_form_idx ON form_versions (form_id);
ALTER TABLE forms
  ADD CONSTRAINT forms_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES form_versions(id) ON DELETE SET NULL;

-- A deployed form_version is immutable. Block UPDATE/DELETE on rows where
-- deployed_at IS NOT NULL.
CREATE OR REPLACE FUNCTION wdc_form_versions_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deployed_at IS NOT NULL THEN
    RAISE EXCEPTION 'form_versions row is deployed and immutable (form_id=%, version=%)',
      OLD.form_id, OLD.version_number USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.deployed_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot delete a deployed form_version (form_id=%, version=%)',
      OLD.form_id, OLD.version_number USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END
$$;
CREATE TRIGGER form_versions_immutable
  BEFORE UPDATE OR DELETE ON form_versions
  FOR EACH ROW EXECUTE FUNCTION wdc_form_versions_immutable();

-- ---------------------------------------------------------------------------
-- Reports + append-only op log + idempotency
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id     uuid NOT NULL REFERENCES form_versions(id) ON DELETE RESTRICT,
  ward_id             uuid NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  submitted_by        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submission_method   text NOT NULL CHECK (submission_method IN ('amira','wizard','snap')),
  state               text NOT NULL DEFAULT 'draft'
                        CHECK (state IN ('draft','submitted','in_review','approved','returned','sealed')),
  sealed_at           timestamptz,
  canonical           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_ward_idx        ON reports (ward_id);
CREATE INDEX reports_submitted_by_idx ON reports (submitted_by);
CREATE INDEX reports_state_idx       ON reports (state);
CREATE TRIGGER reports_set_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

CREATE SEQUENCE report_op_log_seq;

CREATE TABLE report_op_log (
  report_id       uuid    NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  op_id           uuid    NOT NULL,
  server_seq      bigint  NOT NULL DEFAULT nextval('report_op_log_seq'),
  device_id       text    NOT NULL,
  actor_user_id   uuid    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  op_kind         text    NOT NULL
                    CHECK (op_kind IN ('field_set','attachment_add','submit','open_review','approve','return','seal')),
  payload         jsonb   NOT NULL,
  wall_clock_ts   timestamptz NOT NULL,
  server_ts       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, op_id)
);
CREATE UNIQUE INDEX report_op_log_server_seq_uk ON report_op_log (server_seq);
CREATE INDEX report_op_log_report_seq_idx ON report_op_log (report_id, server_seq);

-- The op log is append-only.
CREATE OR REPLACE FUNCTION wdc_report_op_log_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'report_op_log is append-only (op=%)', TG_OP
    USING ERRCODE = 'restrict_violation';
  RETURN NULL;
END
$$;
CREATE TRIGGER report_op_log_append_only
  BEFORE UPDATE OR DELETE ON report_op_log
  FOR EACH ROW EXECUTE FUNCTION wdc_report_op_log_append_only();

CREATE TABLE idempotency_keys (
  key              text PRIMARY KEY,
  request_hash     text NOT NULL,
  response_status  bigint NOT NULL,
  response_body    jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL
);
CREATE INDEX idempotency_keys_expires_idx ON idempotency_keys (expires_at);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

CREATE TABLE attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  kind              text NOT NULL CHECK (kind IN ('audio','image','document')),
  storage_key       text NOT NULL,
  bytes             bigint NOT NULL,
  mime_type         text NOT NULL,
  transcript        text,
  confidence        numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  processing_state  text NOT NULL DEFAULT 'pending'
                      CHECK (processing_state IN ('pending','processing','done','failed')),
  processing_meta   jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attachments_report_idx ON attachments (report_id);
CREATE TRIGGER attachments_set_updated_at BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log (hash-chained)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  actor_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role      text NOT NULL,
  event_kind      text NOT NULL,
  target_table    text,
  target_id       text,
  payload         jsonb NOT NULL,
  prev_hash       text NOT NULL,
  hash            text NOT NULL,
  request_id      uuid
);
CREATE UNIQUE INDEX audit_events_hash_uk ON audit_events (hash);
CREATE INDEX audit_events_occurred_idx ON audit_events (occurred_at);
CREATE INDEX audit_events_target_idx ON audit_events (target_table, target_id);

-- audit_events is append-only — UPDATE/DELETE break the chain.
CREATE OR REPLACE FUNCTION wdc_audit_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only (op=%)', TG_OP
    USING ERRCODE = 'restrict_violation';
  RETURN NULL;
END
$$;
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION wdc_audit_events_append_only();

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------

CREATE TABLE messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL,
  sender_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body_ciphertext   text NOT NULL,
  key_id            text NOT NULL,
  sent_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, sent_at);
CREATE INDEX messages_sender_idx ON messages (sender_user_id);

CREATE TABLE delivery_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel             text NOT NULL CHECK (channel IN ('in_app','email','sms','whatsapp')),
  provider_ref        text,
  status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','sent','delivered','read','failed')),
  payload             jsonb NOT NULL,
  queued_at           timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  delivered_at        timestamptz,
  read_at             timestamptz,
  failed_at           timestamptz,
  error_message       text
);
CREATE INDEX delivery_attempts_recipient_idx ON delivery_attempts (recipient_user_id);
CREATE INDEX delivery_attempts_status_idx ON delivery_attempts (status);

-- ---------------------------------------------------------------------------
-- Investigations
-- ---------------------------------------------------------------------------

CREATE TABLE investigations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  summary     text,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','resolved','closed')),
  priority    text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low','normal','high','urgent')),
  opened_by   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investigations_status_idx ON investigations (status);
CREATE TRIGGER investigations_set_updated_at BEFORE UPDATE ON investigations
  FOR EACH ROW EXECUTE FUNCTION wdc_set_updated_at();

CREATE TABLE investigation_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id    uuid NOT NULL REFERENCES investigations(id) ON DELETE RESTRICT,
  kind                text NOT NULL CHECK (kind IN ('report_ref','attachment_ref','note','external_link')),
  ref_table           text,
  ref_id              text,
  note                text,
  added_by            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investigation_evidence_investigation_idx ON investigation_evidence (investigation_id);

-- ---------------------------------------------------------------------------
-- Embeddings (pgvector). 1536 dims = OpenAI text-embedding-3-small.
-- Any larger model on the same column would require a new migration.
-- ---------------------------------------------------------------------------

CREATE TABLE embeddings (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_table  text NOT NULL,
  source_id     text NOT NULL,
  chunk_index   bigint NOT NULL DEFAULT 0,
  content       text NOT NULL,
  embedding     vector(1536) NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX embeddings_source_idx ON embeddings (source_table, source_id);
-- IVFFLAT cosine index for top-K retrieval; lists tuned in M12 once we have
-- a rough corpus size estimate. Build is cheap on an empty table.
CREATE INDEX embeddings_embedding_cos_idx ON embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMIT;
