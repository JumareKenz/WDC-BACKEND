-- Bootstrap extensions on first DB creation. Tables and RLS policies are
-- introduced in numbered Drizzle migrations starting at M2 (0001_*).
-- Idempotent — safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Read-only role used by the AI Assistant's structured retrieval (M12).
-- Created up front so the application can SET ROLE wdc_ro for safe SQL execution.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wdc_ro') THEN
    CREATE ROLE wdc_ro LOGIN PASSWORD 'wdc_ro';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE wdc TO wdc_ro;
GRANT USAGE ON SCHEMA public TO wdc_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO wdc_ro;
