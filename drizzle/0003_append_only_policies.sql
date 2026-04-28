-- 0003_append_only_policies.sql
--
-- Tighten the append-only tables (audit_events, report_op_log) so the
-- trigger is the canonical enforcement layer for "no UPDATE / DELETE".
--
-- Rationale: 0002_rls.sql enabled RLS on every table including these two,
-- but only added INSERT and SELECT policies. With FORCE RLS, an UPDATE or
-- DELETE attempt finds zero matching rows and silently succeeds with
-- rowCount=0. That is technically secure (no row is mutated) but it hides
-- the violation — application code can't tell the difference between
-- "no such row" and "policy denied". By adding permissive UPDATE/DELETE
-- policies, the BEFORE trigger fires and raises an explicit error so
-- callers (and the audit log) see the violation.

BEGIN;

-- audit_events
CREATE POLICY audit_events_update_system_only ON audit_events
  FOR UPDATE USING (wdc_current_role() = 'system')
  WITH CHECK (wdc_current_role() = 'system');
CREATE POLICY audit_events_delete_system_only ON audit_events
  FOR DELETE USING (wdc_current_role() = 'system');

-- report_op_log
CREATE POLICY report_op_log_update_system_only ON report_op_log
  FOR UPDATE USING (wdc_current_role() = 'system')
  WITH CHECK (wdc_current_role() = 'system');
CREATE POLICY report_op_log_delete_system_only ON report_op_log
  FOR DELETE USING (wdc_current_role() = 'system');

COMMIT;
