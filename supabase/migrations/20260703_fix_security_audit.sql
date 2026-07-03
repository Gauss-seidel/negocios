-- ============================================================
-- Migration: Fix Security & DB Issues
-- Date: 2026-07-03
-- ============================================================

-- ============================================================
-- FIX 1: complete_appointment con search_path + validaciones
-- ============================================================
CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id UUID,
  p_completed_products JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_total DECIMAL(10,2);
  v_product RECORD;
  v_completed_ids UUID[];
  v_product_id UUID;
  v_current_stock INT;
  v_product_name TEXT;
BEGIN
  SELECT business_id INTO v_business_id FROM appointments WHERE id = p_appointment_id;
  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  SELECT ARRAY(SELECT (jsonb_array_elements(p_completed_products)->>'id')::UUID)
  INTO v_completed_ids;

  DELETE FROM appointment_products
  WHERE appointment_id = p_appointment_id
    AND id <> ALL (COALESCE(v_completed_ids, ARRAY[]::UUID[]));

  FOR v_product IN
    SELECT * FROM jsonb_to_recordset(p_completed_products) AS x(id UUID, quantity INT)
  LOOP
    SELECT product_id INTO v_product_id
    FROM appointment_products
    WHERE id = v_product.id;

    IF v_product_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado en la reserva');
    END IF;

    UPDATE appointment_products
    SET quantity = v_product.quantity
    WHERE id = v_product.id;

    SELECT current_stock, name INTO v_current_stock, v_product_name
    FROM inventory_products
    WHERE id = v_product_id;

    IF v_current_stock < v_product.quantity THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Stock insuficiente para "' || v_product_name || '". Disponible: ' || v_current_stock || ', solicitado: ' || v_product.quantity);
    END IF;

    UPDATE inventory_products
    SET current_stock = current_stock - v_product.quantity
    WHERE id = v_product_id;
  END LOOP;

  SELECT COALESCE(SUM(price), 0) INTO v_total
  FROM appointment_services
  WHERE appointment_id = p_appointment_id;

  v_total := v_total + COALESCE(
    (SELECT SUM(price * quantity) FROM appointment_products WHERE appointment_id = p_appointment_id),
    0
  );

  UPDATE appointments
  SET status = 'completed',
      total = v_total,
      updated_at = now()
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$$;

-- ============================================================
-- FIX 2: recalc_appointment_total con appointment_products
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_appointment_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'appointment_services' THEN
    v_appointment_id := COALESCE(NEW.appointment_id, OLD.appointment_id);
  ELSIF TG_TABLE_NAME = 'appointment_products' THEN
    v_appointment_id := COALESCE(NEW.appointment_id, OLD.appointment_id);
  END IF;

  IF v_appointment_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE appointments
  SET total = (
    SELECT COALESCE(SUM(aps.price), 0) + COALESCE(SUM(app.quantity * app.price), 0)
    FROM appointment_services aps
    LEFT JOIN appointment_products app ON app.appointment_id = aps.appointment_id
    WHERE aps.appointment_id = v_appointment_id
    GROUP BY aps.appointment_id
  )
  WHERE id = v_appointment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers on appointment_services
DROP TRIGGER IF EXISTS trg_recalc_total_insert ON appointment_services;
DROP TRIGGER IF EXISTS trg_recalc_total_update ON appointment_services;
DROP TRIGGER IF EXISTS trg_recalc_total_delete ON appointment_services;

CREATE TRIGGER trg_recalc_total_insert
  AFTER INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_update
  AFTER UPDATE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_delete
  AFTER DELETE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

-- New triggers on appointment_products
DROP TRIGGER IF EXISTS trg_recalc_total_product_insert ON appointment_products;
DROP TRIGGER IF EXISTS trg_recalc_total_product_delete ON appointment_products;

CREATE TRIGGER trg_recalc_total_product_insert
  AFTER INSERT ON appointment_products
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_product_delete
  AFTER DELETE ON appointment_products
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

-- ============================================================
-- FIX 3: RLS para super_admins
-- Permite SELECT público sobre super_admins para que las
-- subconsultas de verificación funcionen correctamente.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'super_admins' AND policyname = 'super_admin_select_self'
  ) THEN
    CREATE POLICY "super_admin_select_self" ON super_admins
      FOR SELECT USING (true);
  END IF;
END
$$;

-- ============================================================
-- FIX 4: CHECK constraint stock no negativo
-- ============================================================
ALTER TABLE inventory_products
  DROP CONSTRAINT IF EXISTS check_current_stock_non_negative,
  ADD CONSTRAINT check_current_stock_non_negative
  CHECK (current_stock >= 0);

-- ============================================================
-- FIX 5: Índice en appointment_products.product_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointment_products_product
  ON appointment_products(product_id);

-- ============================================================
-- FIX 6: NOT NULL + DEFAULT en appointment_products.created_at
-- ============================================================
ALTER TABLE appointment_products
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
