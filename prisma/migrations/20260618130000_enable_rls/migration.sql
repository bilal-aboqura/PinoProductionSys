-- Enable RLS for every existing public application table. With no policies for
-- anon/authenticated, PostgreSQL applies default-deny behavior to direct API access.
DO $rls$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );
  END LOOP;
END
$rls$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Fail deployment if any application table escaped RLS hardening.
DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS hardening failed: one or more public application tables do not have RLS enabled';
  END IF;
END
$verify$;
