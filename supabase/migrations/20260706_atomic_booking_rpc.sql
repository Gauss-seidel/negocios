-- ============================================================
-- Migration: Atomic booking RPC
-- Date: 2026-07-06
-- Funcion atomica para crear reservas evitando race conditions.
-- Uso desde frontend: supabase.rpc('create_appointment_atomic', {...})
-- ============================================================

CREATE OR REPLACE FUNCTION create_appointment_atomic(
  p_business_id UUID,
  p_branch_id UUID,
  p_service_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_client_email TEXT,
  p_date DATE,
  p_start_time TIME,
  p_barber_id UUID DEFAULT NULL,
  p_product_ids UUID[] DEFAULT '{}',
  p_product_quantities INT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service RECORD;
  v_duration INT;
  v_price DECIMAL(10,2);
  v_end_time TIME;
  v_barber_id UUID;
  v_client_id UUID;
  v_appointment_id UUID;
  v_existing INT;
  v_i INT;
BEGIN
  -- Validar negocio activo
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Negocio no disponible');
  END IF;

  -- Validar servicio pertenece al negocio
  SELECT duration, price INTO v_duration, v_price
  FROM services
  WHERE id = p_service_id AND business_id = p_business_id AND is_active = true;
  IF v_duration IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Servicio no disponible');
  END IF;

  -- Validar sucursal
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM branches WHERE id = p_branch_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sucursal no disponible');
  END IF;

  -- Calcular hora de fin
  v_end_time := (p_start_time::time + (v_duration || ' minutes')::interval)::time;

  -- Seleccion de barbero (atomico)
  IF p_barber_id IS NULL THEN
    -- Buscar primer barbero disponible de la sucursal sin conflicto
    SELECT b.id INTO v_barber_id
    FROM barbers b
    WHERE b.business_id = p_business_id
      AND b.is_active = true
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.barber_id = b.id
          AND a.date = p_date
          AND a.status NOT IN ('cancelled', 'no_show')
          AND a.start_time < v_end_time
          AND a.end_time > p_start_time
      )
    ORDER BY b.created_at ASC
    LIMIT 1
    FOR UPDATE OF b;
  ELSE
    -- Validar barbero pertenece al negocio
    IF NOT EXISTS (SELECT 1 FROM barbers WHERE id = p_barber_id AND business_id = p_business_id AND is_active = true) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Barbero no disponible');
    END IF;
    -- Verificar conflicto
    SELECT COUNT(*) INTO v_existing
    FROM appointments
    WHERE barber_id = p_barber_id
      AND date = p_date
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time < v_end_time
      AND end_time > p_start_time;
    IF v_existing > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Horario no disponible');
    END IF;
    v_barber_id := p_barber_id;
  END IF;

  IF v_barber_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay barberos disponibles en ese horario');
  END IF;

  -- Registrar/reutilizar cliente
  SELECT id INTO v_client_id
  FROM clients
  WHERE business_id = p_business_id AND phone = p_client_phone
  LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO clients (business_id, name, phone, email)
    VALUES (p_business_id, p_client_name, p_client_phone, NULLIF(p_client_email, ''))
    RETURNING id INTO v_client_id;
  END IF;

  -- Crear cita
  INSERT INTO appointments (business_id, branch_id, client_id, barber_id, date, start_time, end_time, status, total)
  VALUES (p_business_id, p_branch_id, v_client_id, v_barber_id, p_date, p_start_time, v_end_time, 'pending', v_price)
  RETURNING id INTO v_appointment_id;

  -- Servicio
  INSERT INTO appointment_services (appointment_id, service_id, price)
  VALUES (v_appointment_id, p_service_id, v_price);

  -- Productos
  IF array_length(p_product_ids, 1) IS NOT NULL THEN
    FOR v_i IN 1..array_length(p_product_ids, 1) LOOP
      INSERT INTO appointment_products (appointment_id, product_id, quantity, price)
      SELECT v_appointment_id, p_product_ids[v_i], p_product_quantities[v_i],
             (SELECT price FROM inventory_products WHERE id = p_product_ids[v_i]);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id, 'barber_id', v_barber_id, 'end_time', v_end_time);
END;
$$;

REVOKE ALL ON FUNCTION create_appointment_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, DATE, TIME, UUID, UUID[], INT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_appointment_atomic(UUID, UUID, UUID, TEXT, TEXT, TEXT, DATE, TIME, UUID, UUID[], INT[]) TO anon, authenticated;