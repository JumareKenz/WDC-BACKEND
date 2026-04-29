-- 0005_reports_approved_at.sql
--
-- Records when a report transitioned to `approved`. The sealing job uses this
-- (not updated_at, which is overwritten by the wdc_set_updated_at trigger on
-- every subsequent write) to compute "approved-and-aged-past-grace".
--
-- Cleared back to NULL on a 'returned' transition so a re-approval picks up
-- a fresh grace window.

BEGIN;

ALTER TABLE reports
  ADD COLUMN approved_at timestamptz;

CREATE INDEX reports_approved_idx ON reports (approved_at)
  WHERE state = 'approved';

COMMIT;
