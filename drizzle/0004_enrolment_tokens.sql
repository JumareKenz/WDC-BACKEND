-- 0004_enrolment_tokens.sql
--
-- Onboarding flow: when a director creates a user, no PIN/password is set.
-- Instead a one-time enrolment token (random 32 bytes, sha256-hashed at rest)
-- is generated. The user redeems it via POST /auth/set-credentials within
-- 24h to set their PIN (mobile) or password+TOTP (console).
--
-- Stored on users (rather than a separate table) because there's at most one
-- pending enrolment per user and clearing it on redeem is straightforward.

BEGIN;

ALTER TABLE users
  ADD COLUMN enrolment_token_hash bytea,
  ADD COLUMN enrolment_expires_at timestamptz;

CREATE UNIQUE INDEX users_enrolment_token_uk
  ON users (enrolment_token_hash)
  WHERE enrolment_token_hash IS NOT NULL;

CREATE INDEX users_enrolment_expires_idx
  ON users (enrolment_expires_at)
  WHERE enrolment_expires_at IS NOT NULL;

COMMIT;
