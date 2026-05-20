-- Add must_reset_password flag for migrated users who need to set new credentials
ALTER TABLE users ADD COLUMN must_reset_password boolean NOT NULL DEFAULT false;
