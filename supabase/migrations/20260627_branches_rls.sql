-- Migration: RLS policies for branches table
-- Ejecutar después de 20260626_create_branches.sql
-- Habilita CRUD para business admins via la app

-- 1. Asegurar RLS habilitado
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: business_staff puede ver sucursales de su negocio
CREATE POLICY "business_staff_select_branches" ON branches
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_staff WHERE user_id = auth.uid()
    )
  );

-- 3. INSERT: business_admin puede crear sucursales en su negocio
CREATE POLICY "business_admin_insert_branches" ON branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_staff
      WHERE user_id = auth.uid() AND role = 'business_admin'
    )
  );

-- 4. UPDATE: business_admin puede modificar sucursales de su negocio
CREATE POLICY "business_admin_update_branches" ON branches
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_staff
      WHERE user_id = auth.uid() AND role = 'business_admin'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_staff
      WHERE user_id = auth.uid() AND role = 'business_admin'
    )
  );

-- 5. DELETE: business_admin puede eliminar sucursales de su negocio
CREATE POLICY "business_admin_delete_branches" ON branches
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_staff
      WHERE user_id = auth.uid() AND role = 'business_admin'
    )
  );
