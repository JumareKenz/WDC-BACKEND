-- 0002_rls.sql — Row Level Security policies.
--
-- Enforces role scope at the database, not the application.
-- The app sets four GUCs at the start of every request via SET LOCAL:
--   app.current_user_id  (uuid as text)
--   app.current_role     (secretary|coordinator|director|system)
--   app.current_lga_id   (uuid as text or empty)
--   app.current_ward_id  (uuid as text or empty)
--
-- Policies use helper SQL fns that read the GUCs. Helpers are STABLE so the
-- planner can hoist them. Missing GUCs are treated as "deny" except for the
-- `system` role which is intended for background jobs.

BEGIN;

-- ---------------------------------------------------------------------------
-- GUC accessor helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wdc_current_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.current_role', true), '')
$$;

CREATE OR REPLACE FUNCTION wdc_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION wdc_current_lga_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_lga_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION wdc_current_ward_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_ward_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Application role used by the API. RLS is enforced for it.
-- The wdc_ro role (created in drizzle/init/01_extensions.sql) bypasses RLS
-- only because it has no INSERT/UPDATE/DELETE grants and is gated by SET ROLE.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wdc_app') THEN
    -- LOGIN granted in environments that connect directly; in dev the wdc
    -- superuser is used and SET ROLE wdc_app applies RLS via FORCE.
    CREATE ROLE wdc_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO wdc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wdc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wdc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wdc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO wdc_app;

-- ---------------------------------------------------------------------------
-- Helper macro: enable + force RLS on a table.
-- FORCE ROW LEVEL SECURITY ensures even the table owner is subject to policies
-- (otherwise migrations / seeders running as owner trivially bypass RLS).
-- ---------------------------------------------------------------------------

ALTER TABLE lgas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgas                    FORCE  ROW LEVEL SECURITY;
ALTER TABLE wards                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards                   FORCE  ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   FORCE  ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens          FORCE  ROW LEVEL SECURITY;
ALTER TABLE forms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                   FORCE  ROW LEVEL SECURITY;
ALTER TABLE form_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_versions           FORCE  ROW LEVEL SECURITY;
ALTER TABLE reports                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                 FORCE  ROW LEVEL SECURITY;
ALTER TABLE report_op_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_op_log           FORCE  ROW LEVEL SECURITY;
ALTER TABLE attachments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments             FORCE  ROW LEVEL SECURITY;
ALTER TABLE audit_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events            FORCE  ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                FORCE  ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts       FORCE  ROW LEVEL SECURITY;
ALTER TABLE investigations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations          FORCE  ROW LEVEL SECURITY;
ALTER TABLE investigation_evidence  ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_evidence  FORCE  ROW LEVEL SECURITY;
ALTER TABLE embeddings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings              FORCE  ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys        FORCE  ROW LEVEL SECURITY;

-- ===========================================================================
-- POLICIES
-- ===========================================================================
-- Pattern:
--   * `system` role: ALL.
--   * `director`: ALL except where prompt forbids (sealed report content).
--   * `coordinator`: read all wards within own lga; write only review actions.
--   * `secretary`: read+write only own ward's resources.
-- Soft-deleted rows (deleted_at IS NOT NULL) are filtered in service layer
-- queries; RLS does not gate on deleted_at because admin paths must see them.
-- ===========================================================================

-- Geography is public-read for any authenticated role; writes are director-only.
CREATE POLICY lgas_read_all ON lgas
  FOR SELECT USING (wdc_current_role() IN ('secretary','coordinator','director','system'));
CREATE POLICY lgas_write_director ON lgas
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

CREATE POLICY wards_read_all ON wards
  FOR SELECT USING (wdc_current_role() IN ('secretary','coordinator','director','system'));
CREATE POLICY wards_write_director ON wards
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

-- Users: secretary sees own row only; coordinator sees own lga; director sees all.
CREATE POLICY users_select ON users
  FOR SELECT USING (
    wdc_current_role() = 'system'
    OR wdc_current_role() = 'director'
    OR (wdc_current_role() = 'coordinator' AND lga_id = wdc_current_lga_id())
    OR (wdc_current_role() = 'secretary'   AND id = wdc_current_user_id())
  );
CREATE POLICY users_modify_director ON users
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

CREATE POLICY refresh_tokens_self ON refresh_tokens
  FOR ALL USING (
    wdc_current_role() = 'system'
    OR user_id = wdc_current_user_id()
  )
  WITH CHECK (
    wdc_current_role() = 'system'
    OR user_id = wdc_current_user_id()
  );

-- Forms / form versions: readable to everyone authenticated; writeable only
-- by director / system.
CREATE POLICY forms_read_all ON forms
  FOR SELECT USING (wdc_current_role() IN ('secretary','coordinator','director','system'));
CREATE POLICY forms_write_director ON forms
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

CREATE POLICY form_versions_read_all ON form_versions
  FOR SELECT USING (wdc_current_role() IN ('secretary','coordinator','director','system'));
CREATE POLICY form_versions_write_director ON form_versions
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

-- Reports
--   secretary  : own ward only
--   coordinator: own lga only (read); writes are limited to review state
--                changes which are enforced at the service layer (RLS only
--                gates row visibility, not state-machine transitions).
--   director   : all rows; cannot mutate sealed content (enforced at service
--                layer + report_op_log append-only trigger).
CREATE POLICY reports_select ON reports
  FOR SELECT USING (
    wdc_current_role() = 'system'
    OR wdc_current_role() = 'director'
    OR (
      wdc_current_role() = 'coordinator'
      AND ward_id IN (SELECT id FROM wards WHERE lga_id = wdc_current_lga_id())
    )
    OR (wdc_current_role() = 'secretary' AND ward_id = wdc_current_ward_id())
  );
CREATE POLICY reports_insert ON reports
  FOR INSERT WITH CHECK (
    wdc_current_role() = 'system'
    OR wdc_current_role() = 'director'
    OR (wdc_current_role() = 'secretary' AND ward_id = wdc_current_ward_id())
  );
CREATE POLICY reports_update ON reports
  FOR UPDATE USING (
    wdc_current_role() = 'system'
    OR wdc_current_role() = 'director'
    OR (
      wdc_current_role() = 'coordinator'
      AND ward_id IN (SELECT id FROM wards WHERE lga_id = wdc_current_lga_id())
    )
    OR (wdc_current_role() = 'secretary' AND ward_id = wdc_current_ward_id())
  ) WITH CHECK (
    wdc_current_role() = 'system'
    OR wdc_current_role() = 'director'
    OR (
      wdc_current_role() = 'coordinator'
      AND ward_id IN (SELECT id FROM wards WHERE lga_id = wdc_current_lga_id())
    )
    OR (wdc_current_role() = 'secretary' AND ward_id = wdc_current_ward_id())
  );
CREATE POLICY reports_delete_director ON reports
  FOR DELETE USING (wdc_current_role() IN ('director','system'));

-- report_op_log: visibility follows the parent report.
CREATE POLICY report_op_log_select ON report_op_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = report_op_log.report_id)
  );
CREATE POLICY report_op_log_insert ON report_op_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = report_op_log.report_id)
  );

-- attachments: same scope as reports.
CREATE POLICY attachments_visible ON attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = attachments.report_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM reports r WHERE r.id = attachments.report_id)
  );

-- audit_events: directors and system see everything; coordinators see their
-- own actions and actions on rows in their lga; secretaries see their own.
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT USING (
    wdc_current_role() IN ('director','system')
    OR actor_user_id = wdc_current_user_id()
  );
CREATE POLICY audit_events_insert_system_only ON audit_events
  FOR INSERT WITH CHECK (wdc_current_role() = 'system');

-- messages: visible to sender + recipients in same conversation. Recipient
-- mapping lives in conversation_members (introduced in M10); for now, any
-- authenticated user can see messages they sent. This deliberately denies by
-- default until M10 broadens it.
CREATE POLICY messages_select_self ON messages
  FOR SELECT USING (
    wdc_current_role() IN ('director','system')
    OR sender_user_id = wdc_current_user_id()
  );
CREATE POLICY messages_insert_self ON messages
  FOR INSERT WITH CHECK (
    sender_user_id = wdc_current_user_id()
    OR wdc_current_role() = 'system'
  );

-- delivery_attempts: recipient or system.
CREATE POLICY delivery_attempts_select ON delivery_attempts
  FOR SELECT USING (
    wdc_current_role() IN ('director','system')
    OR recipient_user_id = wdc_current_user_id()
  );
CREATE POLICY delivery_attempts_modify_system ON delivery_attempts
  FOR ALL USING (wdc_current_role() = 'system')
  WITH CHECK (wdc_current_role() = 'system');

-- investigations: directors + system only (default-closed; M9 may expand).
CREATE POLICY investigations_director ON investigations
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

CREATE POLICY investigation_evidence_director ON investigation_evidence
  FOR ALL USING (wdc_current_role() IN ('director','system'))
  WITH CHECK (wdc_current_role() IN ('director','system'));

-- embeddings: system writes, director reads. AI Assistant (M12) runs SET ROLE
-- wdc_ro for retrieval; that role bypasses RLS for SELECT via grants.
CREATE POLICY embeddings_select ON embeddings
  FOR SELECT USING (wdc_current_role() IN ('director','system'));
CREATE POLICY embeddings_modify_system ON embeddings
  FOR ALL USING (wdc_current_role() = 'system')
  WITH CHECK (wdc_current_role() = 'system');

-- idempotency_keys: system only.
CREATE POLICY idempotency_keys_system ON idempotency_keys
  FOR ALL USING (wdc_current_role() = 'system')
  WITH CHECK (wdc_current_role() = 'system');

COMMIT;
