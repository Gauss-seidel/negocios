-- ============================================================
-- Migration: Security Hardening
-- Date: 2026-07-04
-- Endurece RLS publicas, funciones SECURITY DEFINER y limites de planes.
-- ============================================================

-- ============================================================
-- 1. is_super_admin() helper
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE id = auth.uid());
$$;

REVOKE ALL ON FUNCTION is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- ============================================================
-- 2. RLS para super_admins (restringido)
-- ============================================================
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_select_self" ON super_admins;
CREATE POLICY "super_admin_select_self" ON super_admins
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "super_admin_insert" ON super_admins;
CREATE POLICY "super_admin_insert" ON super_admins
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "super_admin_update" ON super_admins;
CREATE POLICY "super_admin_update" ON super_admins
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "super_admin_delete" ON super_admins;
CREATE POLICY "super_admin_delete" ON super_admins
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- ============================================================
-- 3. Endurecer inserciones publicas (anon)
-- ============================================================
-- appointments: solo negocios activos + barbero/sucursal del mismo negocio
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='anon_insert_appointments') THEN
    DROP POLICY "anon_insert_appointments" ON appointments;
  END IF;
  CREATE POLICY "anon_insert_appointments" ON appointments
    FOR INSERT TO anon
    WITH CHECK (
      business_id IN (SELECT id FROM businesses WHERE status = 'active')
      AND (barber_id IS NULL OR barber_id IN (SELECT id FROM barbers WHERE business_id = appointments.business_id))
      AND (branch_id IS NULL OR branch_id IN (SELECT id FROM branches WHERE business_id = appointments.business_id AND is_active = true))
    );
END
$$;

-- appointment_services: anon solo para citas del negocio activo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointment_services' AND policyname='anon_insert_appointment_services') THEN
    CREATE POLICY "anon_insert_appointment_services" ON appointment_services
      FOR INSERT TO anon
      WITH CHECK (
        appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE status = 'active'))
        AND service_id IN (
          SELECT s.id FROM services s
          JOIN appointments a ON a.id = appointment_services.appointment_id
          WHERE s.business_id = a.business_id AND s.is_active = true
        )
      );
  END IF;
END
$$;

-- appointment_products: anon solo para citas del negocio activo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointment_products' AND policyname='anon_insert_appointment_products') THEN
    CREATE POLICY "anon_insert_appointment_products" ON appointment_products
      FOR INSERT TO anon
      WITH CHECK (
        appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE status = 'active'))
        AND product_id IN (
          SELECT p.id FROM inventory_products p
          JOIN appointments a ON a.id = appointment_products.appointment_id
          WHERE p.business_id = a.business_id AND p.is_active = true AND p.is_product = true
        )
      );
  END IF;
END
$$;

-- clients: solo negocios activos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='anon_insert_clients') THEN
    DROP POLICY "anon_insert_clients" ON clients;
  END IF;
  CREATE POLICY "anon_insert_clients" ON clients
    FOR INSERT TO anon
    WITH CHECK (
      business_id IN (SELECT id FROM businesses WHERE status = 'active')
    );
END
$$;

-- ============================================================
-- 4. Validacion de limites de planes (barberos y sucursales)
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_barber_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_slug TEXT;
  v_max INT;
  v_count INT;
BEGIN
  SELECT plan INTO v_plan_slug FROM businesses WHERE id = NEW.business_id;
  IF v_plan_slug IS NULL THEN
    RAISE EXCEPTION 'Negocio sin plan asignado';
  END IF;
  SELECT max_barbers INTO v_max FROM plans WHERE slug = v_plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado';
  END IF;

  IF v_max IS NOT NULL AND v_max < 999999 THEN
    SELECT COUNT(*) INTO v_count FROM barbers WHERE business_id = NEW.business_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Limite de barberos alcanzado para el plan actual';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_barber_limit ON barbers;
CREATE TRIGGER trg_enforce_barber_limit
  BEFORE INSERT ON barbers
  FOR EACH ROW EXECUTE FUNCTION enforce_barber_limit();

CREATE OR REPLACE FUNCTION enforce_branch_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_slug TEXT;
  v_max INT;
  v_count INT;
BEGIN
  SELECT plan INTO v_plan_slug FROM businesses WHERE id = NEW.business_id;
  IF v_plan_slug IS NULL THEN
    RAISE EXCEPTION 'Negocio sin plan asignado';
  END IF;
  SELECT max_branches INTO v_max FROM plans WHERE slug = v_plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado';
  END IF;

  IF v_max IS NOT NULL AND v_max < 999999 THEN
    SELECT COUNT(*) INTO v_count FROM branches WHERE business_id = NEW.business_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Limite de sucursales alcanzado para el plan actual';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON branches;
CREATE TRIGGER trg_enforce_branch_limit
  BEFORE INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION enforce_branch_limit();

-- ============================================================
-- 5. search_path seguro en funciones SECURITY DEFINER existentes
-- (re-aplicar a complete_appointment y recalc ya tienen search_path)
-- ============================================================
-- audit_trigger ya tiene search_path.

-- ============================================================
-- 6. Indices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_business_date
  ON appointments(business_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date
  ON appointments(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_barbers_business
  ON barbers(business_id);
CREATE INDEX IF NOT EXISTS idx_branches_business
  ON branches(business_id);