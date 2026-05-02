-- 0008_audit_anchors.sql
--
-- Daily audit-chain anchor. The audit log is hash-chained per row
-- (hash = sha256(prev_hash || canonical_json)); a periodic anchor signs the
-- latest hash with a long-lived asymmetric key and stores the signature
-- separately. Anchor tampering would require both the audit_events table
-- AND a valid signature over the anchored hash — and the chain itself is
-- self-contained, so verification only needs the anchor + the public key.
--
-- The anchor table is append-only — same protection as audit_events.

BEGIN;

CREATE TABLE audit_anchors (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  anchored_at     timestamptz NOT NULL DEFAULT now(),
  -- The audit_events.id of the latest event covered by this anchor.
  latest_event_id bigint NOT NULL REFERENCES audit_events(id) ON DELETE RESTRICT,
  -- The hash of latest_event_id (denormalised so anchor verification doesn't
  -- need to read audit_events at all).
  latest_hash     text NOT NULL,
  -- Signing-algorithm marker so future rotations can distinguish ed25519,
  -- RSA-PSS, etc. without ambiguity. M11 uses 'rsa-sha256' against the
  -- JWT RSA private key.
  signature_alg   text NOT NULL,
  -- Identifier for the public key needed to verify; M11 hardcodes 'jwt-dev'
  -- but production would use the KMS key id.
  signing_key_id  text NOT NULL,
  -- Base64url-encoded raw signature bytes.
  signature       text NOT NULL
);

CREATE INDEX audit_anchors_anchored_idx ON audit_anchors (anchored_at);

-- Append-only enforcement (mirroring audit_events / report_op_log).
CREATE OR REPLACE FUNCTION wdc_audit_anchors_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_anchors is append-only (op=%)', TG_OP
    USING ERRCODE = 'restrict_violation';
  RETURN NULL;
END
$$;
CREATE TRIGGER audit_anchors_append_only
  BEFORE UPDATE OR DELETE ON audit_anchors
  FOR EACH ROW EXECUTE FUNCTION wdc_audit_anchors_append_only();

-- RLS: directors and system can read; only system can insert.
ALTER TABLE audit_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_anchors FORCE  ROW LEVEL SECURITY;

CREATE POLICY audit_anchors_select ON audit_anchors
  FOR SELECT USING (wdc_current_role() IN ('director', 'system'));
CREATE POLICY audit_anchors_insert_system_only ON audit_anchors
  FOR INSERT WITH CHECK (wdc_current_role() = 'system');

GRANT SELECT, INSERT ON audit_anchors TO wdc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wdc_app;

COMMIT;
