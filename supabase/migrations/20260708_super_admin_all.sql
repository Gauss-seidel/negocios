-- ============================================================
-- Migration: Add super_admin_all policies to remaining tables
-- Date: 2026-07-08
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['appointment_products', 'audit_log', 'super_admins'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'super_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "super_admin_all" ON %I FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin())',
        tbl
      );
    END IF;
  END LOOP;
END
$$;