-- M10 — Allow recipients to update their own delivery_attempts (mark-read)
-- and allow directors to update delivery_attempts they created via broadcast.
-- Production will move most modifications to a system worker; these policies
-- unblock the M10 service-layer dispatch path.

BEGIN;

-- Recipients can update their own deliveries (e.g. mark as read)
CREATE POLICY delivery_attempts_update_recipient ON delivery_attempts
  FOR UPDATE USING (recipient_user_id = wdc_current_user_id())
  WITH CHECK (recipient_user_id = wdc_current_user_id());

COMMIT;
