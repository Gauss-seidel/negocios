-- ============================================================
-- Migration: Security Phase 2
-- audit_log, anti-spam booking, RLS faltantes
-- ============================================================

-- ============================================================
-- 1. TABLA audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. FUNCIÓN audit_trigger()
-- ============================================================
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  BEGIN
    v_user_email := (SELECT email FROM auth.users WHERE id = v_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_user_email := NULL;
  END;

  INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, user_id, user_email)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    v_user_id,
    v_user_email
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- 3. TRIGGERS en tablas críticas
-- ============================================================
-- appointments
DROP TRIGGER IF EXISTS trg_audit_appointments ON appointments;
CREATE TRIGGER trg_audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- clients
DROP TRIGGER IF EXISTS trg_audit_clients ON clients;
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- cash_movements
DROP TRIGGER IF EXISTS trg_audit_cash_movements ON cash_movements;
CREATE TRIGGER trg_audit_cash_movements
  AFTER INSERT OR UPDATE OR DELETE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- cash_register
DROP TRIGGER IF EXISTS trg_audit_cash_register ON cash_register;
CREATE TRIGGER trg_audit_cash_register
  AFTER INSERT OR UPDATE OR DELETE ON cash_register
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- inventory_products
DROP TRIGGER IF EXISTS trg_audit_inventory ON inventory_products;
CREATE TRIGGER trg_audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- business_staff
DROP TRIGGER IF EXISTS trg_audit_business_staff ON business_staff;
CREATE TRIGGER trg_audit_business_staff
  AFTER INSERT OR UPDATE OR DELETE ON business_staff
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- services
DROP TRIGGER IF EXISTS trg_audit_services ON services;
CREATE TRIGGER trg_audit_services
  AFTER INSERT OR UPDATE OR DELETE ON services
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- businesses
DROP TRIGGER IF EXISTS trg_audit_businesses ON businesses;
CREATE TRIGGER trg_audit_businesses
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================
-- 4. ANTI-SPAM: limitar reservas por teléfono
-- ============================================================
CREATE OR REPLACE FUNCTION check_booking_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_phone TEXT;
  v_recent_count INT;
BEGIN
  -- Obtener teléfono del cliente
  SELECT phone INTO v_client_phone FROM clients WHERE id = NEW.client_id;
  
  IF v_client_phone IS NULL THEN
    RETURN NEW;
  END IF;

  -- Contar reservas de las últimas 2 horas con el mismo teléfono
  SELECT COUNT(*) INTO v_recent_count
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  WHERE c.phone = v_client_phone
    AND a.created_at > now() - interval '2 hours'
    AND a.status NOT IN ('cancelled', 'no_show');

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Demasiadas reservas desde este número. Intentá de nuevo más tarde.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_booking_spam ON appointments;
CREATE TRIGGER trg_check_booking_spam
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_booking_spam();

-- ============================================================
-- 5. RLS: asegurar RLS activado en todas las tablas
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables_without_rls TEXT[] := ARRAY[
    'appointments', 'appointment_services', 'appointment_products',
    'barbers', 'barber_services', 'businesses', 'business_hours',
    'business_staff', 'cash_movements', 'cash_register',
    'clients', 'inventory_movements', 'inventory_products',
    'notifications', 'plans', 'services', 'branches'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_without_rls
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- 6. RLS POLICIES: appointments
-- ============================================================
-- Anon: solo insert (crear reserva)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'anon_insert_appointments') THEN
    CREATE POLICY "anon_insert_appointments" ON appointments
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END;
$$;

-- Staff: SELECT/UPDATE sobre su negocio
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'staff_select_appointments') THEN
    CREATE POLICY "staff_select_appointments" ON appointments
      FOR SELECT TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'staff_update_appointments') THEN
    CREATE POLICY "staff_update_appointments" ON appointments
      FOR UPDATE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      )
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- Barbero: solo sus propias citas (si existe columna user_id en barbers)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'user_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'barber_select_own') THEN
      EXECUTE 'CREATE POLICY "barber_select_own" ON appointments
        FOR SELECT TO authenticated
        USING (barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid()))';
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 7. RLS POLICIES: clients
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'staff_select_clients') THEN
    CREATE POLICY "staff_select_clients" ON clients
      FOR SELECT TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'staff_insert_clients') THEN
    CREATE POLICY "staff_insert_clients" ON clients
      FOR INSERT TO authenticated
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- Anon: puede insertar clientes al crear reserva
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'anon_insert_clients') THEN
    CREATE POLICY "anon_insert_clients" ON clients
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END;
$$;

-- ============================================================
-- 8. RLS POLICIES: inventory_products
-- ============================================================
-- Anon: solo ver productos activos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_products' AND policyname = 'anon_select_active_inventory') THEN
    CREATE POLICY "anon_select_active_inventory" ON inventory_products
      FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END;
$$;

-- Staff: CRUD sobre su negocio
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_products' AND policyname = 'staff_select_inventory') THEN
    CREATE POLICY "staff_select_inventory" ON inventory_products
      FOR SELECT TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_products' AND policyname = 'staff_insert_inventory') THEN
    CREATE POLICY "staff_insert_inventory" ON inventory_products
      FOR INSERT TO authenticated
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_products' AND policyname = 'staff_update_inventory') THEN
    CREATE POLICY "staff_update_inventory" ON inventory_products
      FOR UPDATE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      )
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_products' AND policyname = 'staff_delete_inventory') THEN
    CREATE POLICY "staff_delete_inventory" ON inventory_products
      FOR DELETE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- ============================================================
-- 9. RLS POLICIES: cash_movements + cash_register
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_movements' AND policyname = 'staff_select_cash_movements') THEN
    CREATE POLICY "staff_select_cash_movements" ON cash_movements
      FOR SELECT TO authenticated
      USING (
        branch_id IN (SELECT id FROM branches WHERE business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid()))
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_movements' AND policyname = 'staff_insert_cash_movements') THEN
    CREATE POLICY "staff_insert_cash_movements" ON cash_movements
      FOR INSERT TO authenticated
      WITH CHECK (
        branch_id IN (SELECT id FROM branches WHERE business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid()))
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_register' AND policyname = 'staff_select_cash_register') THEN
    CREATE POLICY "staff_select_cash_register" ON cash_register
      FOR SELECT TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_register' AND policyname = 'staff_insert_cash_register') THEN
    CREATE POLICY "staff_insert_cash_register" ON cash_register
      FOR INSERT TO authenticated
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_register' AND policyname = 'staff_update_cash_register') THEN
    CREATE POLICY "staff_update_cash_register" ON cash_register
      FOR UPDATE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      )
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- ============================================================
-- 10. RLS POLICIES: services, business_hours (público select)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'anon_select_active_services') THEN
    CREATE POLICY "anon_select_active_services" ON services
      FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'staff_select_services') THEN
    CREATE POLICY "staff_select_services" ON services
      FOR SELECT TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'staff_insert_services') THEN
    CREATE POLICY "staff_insert_services" ON services
      FOR INSERT TO authenticated
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'staff_update_services') THEN
    CREATE POLICY "staff_update_services" ON services
      FOR UPDATE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      )
      WITH CHECK (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'staff_delete_services') THEN
    CREATE POLICY "staff_delete_services" ON services
      FOR DELETE TO authenticated
      USING (
        business_id IN (SELECT business_id FROM business_staff WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- business_hours: público solo ver activos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'anon_select_business_hours') THEN
    CREATE POLICY "anon_select_business_hours" ON business_hours
      FOR SELECT TO anon
      USING (true);
  END IF;
END;
$$;

-- ============================================================
-- 11. RLS POLICIES: branches (público activas)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'anon_select_active_branches') THEN
    CREATE POLICY "anon_select_active_branches" ON branches
      FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END;
$$;

-- ============================================================
-- 12. INDICE para performance del anti-spam
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_created_at
  ON appointments(created_at);

CREATE INDEX IF NOT EXISTS idx_clients_phone
  ON clients(phone);

-- ============================================================
-- 13. GRANT: anon puede leer su propio audit_log? NO. Solo super admins.
-- ============================================================
-- (solo authenticated puede leer audit_log si se necesita)
-- Por ahora no exponemos audit_log al frontend.
