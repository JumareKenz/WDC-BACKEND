-- M10 — Messaging RLS expansion
-- delivery_attempts was originally system-only for writes. The broadcast
-- composer (director) needs to insert rows so the adapters can track
-- state.

BEGIN;

CREATE POLICY delivery_attempts_insert_director ON delivery_attempts
  FOR INSERT WITH CHECK (wdc_current_role() IN ('director','system'));

COMMIT;
