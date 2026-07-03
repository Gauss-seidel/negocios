-- ============================================================
-- Fix: Falta policy super_admin_all en branches
-- Causa: Al crear una barbería, el super_admin inserta en branches
-- pero no había policy que lo permitiera (única tabla sin super_admin_all)
-- ============================================================

-- Permitir super_admin todas las operaciones en branches
CREATE POLICY "super_admin_all" ON branches
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
