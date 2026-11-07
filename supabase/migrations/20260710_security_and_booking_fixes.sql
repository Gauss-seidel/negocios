-- ============================================================================
-- 20260710_security_and_booking_fixes.sql
-- Auditoría independiente — correcciones de seguridad e integridad.
--
-- ESTADO: PENDIENTE DE APROBACIÓN. No ejecutar en producción sin revisión.
-- Es idempotente en lo posible (IF EXISTS / CREATE OR REPLACE).
--
-- Hallazgos corregidos:
--   C1. anon podía leer TODOS los clientes (PII) de cualquier negocio activo.
--   C2. anon podía leer TODAS las reservas/productos de cualquier negocio.
--   C3. anon podía ejecutar complete_appointment (SECURITY DEFINER) sobre
--       cualquier reserva, sin autorización de negocio/rol.
--   C4. create_appointment_atomic aceptaba productos de OTRO negocio y no
--       validaba stock/pertenencia; no serializaba reservas concurrentes.
--   C5. políticas public_insert anulaban las validaciones anon_* (OR de RLS).
--   C6. recalc_appointment_total inflaba totales (producto cartesiano).
--   C7. complete_appointment aplicaba cambios parciales si fallaba el stock.
--   C8. límites de plan inconsistentes entre triggers (activos vs todos).
--   C9. check_booking_spam contaba reservas de otros negocios.
--
-- Notas de diseño:
--   * 999999 es la representación técnica de "ilimitado" en planes
--     (la columna es NOT NULL). El frontend debe mostrarlo como "Ilimitado".
--   * No se eliminan tablas, columnas ni datos. No se desactiva RLS.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Cerrar superficie de escritura/lectura anónima directa sobre datos privados
-- ---------------------------------------------------------------------------

-- Las reservas se crean exclusivamente por RPC (SECURITY DEFINER). Las
-- políticas anon_* de INSERT permitían inserción directa y las public_insert
-- más laxas anulaban sus validaciones (las políticas permisivas se combinan con OR).
DROP POLICY IF EXISTS anon_insert_appointments        ON public.appointments;
DROP POLICY IF EXISTS public_insert                   ON public.appointments;
DROP POLICY IF EXISTS anon_insert_appointment_services ON public.appointment_services;
DROP POLICY IF EXISTS public_insert                   ON public.appointment_services;
DROP POLICY IF EXISTS anon_insert_appointment_products ON public.appointment_products;
DROP POLICY IF EXISTS public_insert                   ON public.appointment_products;
DROP POLICY IF EXISTS client_insert_appointment_products ON public.appointment_products;
DROP POLICY IF EXISTS anon_insert_clients             ON public.clients;
DROP POLICY IF EXISTS public_insert                   ON public.clients;

-- Lectura pública de datos privados (clientes, reservas, productos de reserva).
DROP POLICY IF EXISTS public_read ON public.clients;
DROP POLICY IF EXISTS public_read ON public.appointments;
DROP POLICY IF EXISTS public_read ON public.appointment_products;

-- Políticas anónimas demasiado amplias: no filtraban por negocio ACTIVO
-- (permitían enumerar datos de negocios suspendidos) y no aportaban nada
-- porque ya existe una política public_read equivalente mejor acotada.
DROP POLICY IF EXISTS anon_select_business_hours   ON public.business_hours;
DROP POLICY IF EXISTS anon_select_active_inventory ON public.inventory_products;
DROP POLICY IF EXISTS anon_select_active_services  ON public.services;

-- Sucursales: no existía public_read, se reemplazan las dos políticas
-- permisivas por una única acotada a negocios activos.
DROP POLICY IF EXISTS anon_select_active_branches  ON public.branches;
DROP POLICY IF EXISTS public_select_active_branches ON public.branches;

CREATE POLICY anon_select_active_branches ON public.branches
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = branches.business_id AND b.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Helpers públicos mínimos (reemplazan lecturas directas de tablas privadas)
-- ---------------------------------------------------------------------------

-- Disponibilidad: solo devuelve inicio/fin de reservas ocupadas del negocio.
CREATE OR REPLACE FUNCTION public.get_busy_slots(
  p_business_id uuid,
  p_date        date,
  p_barber_id   uuid DEFAULT NULL
)
RETURNS TABLE(start_time time, end_time time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT a.start_time, a.end_time
    FROM public.appointments a
    WHERE a.business_id = p_business_id
      AND a.date = p_date
      AND a.status NOT IN ('cancelled', 'no_show')
      AND (p_barber_id IS NULL OR a.barber_id = p_barber_id);
END;
$fn$;

-- Cola pública (pantalla TV): solo campos necesarios y de un negocio concreto.
CREATE OR REPLACE FUNCTION public.get_public_queue(
  p_business_id uuid,
  p_branch_id   uuid DEFAULT NULL,
  p_date        date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'date', a.date,
        'start_time', a.start_time,
        'end_time', a.end_time,
        'status', a.status,
        'branch_id', a.branch_id,
        'client', jsonb_build_object('name', c.name),
        'barber', jsonb_build_object('id', b.id, 'name', b.name),
        'services', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('service', jsonb_build_object('name', s.name)))
          FROM public.appointment_services aps
          JOIN public.services s ON s.id = aps.service_id
          WHERE aps.appointment_id = a.id
        ), '[]'::jsonb)
      )
      ORDER BY a.start_time
    ),
    '[]'::jsonb
  )
  FROM public.appointments a
  JOIN public.businesses biz ON biz.id = a.business_id AND biz.status = 'active'
  LEFT JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN public.barbers b ON b.id = a.barber_id
  WHERE a.business_id = p_business_id
    AND a.date = p_date
    AND a.status IN ('pending', 'confirmed', 'in_progress', 'completed')
    AND (p_branch_id IS NULL OR a.branch_id = p_branch_id);
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Reserva atómica endurecida
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_business_id   uuid,
  p_branch_id     uuid,
  p_service_id    uuid,
  p_client_name   text,
  p_client_phone  text,
  p_client_email  text,
  p_date          date,
  p_start_time    time,
  p_barber_id     uuid DEFAULT NULL,
  p_product_ids   uuid[] DEFAULT '{}',
  p_product_quantities integer[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_duration        integer;
  v_price           numeric(12,2);
  v_end_time        time;
  v_barber_id       uuid;
  v_barber_branch   uuid;
  v_client_id       uuid;
  v_appointment_id  uuid;
  v_existing        integer;
  v_i               integer;
  v_total           numeric(12,2);
  v_products_total  numeric(12,2) := 0;
  v_qty             integer;
  v_product_price   numeric(12,2);
  v_product_stock   integer;
  v_product_name    text;
  v_day             integer;
  v_open_time       time;
  v_close_time      time;
  v_is_closed       boolean;
  v_hours_found     boolean := false;
  v_branch_scope    uuid;
BEGIN
  -- Serializa reservas concurrentes del mismo negocio y día.
  -- Se libera automáticamente al terminar la transacción.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || p_date::text, 0)
  );

  -- Validaciones de entrada
  IF p_client_name IS NULL OR length(btrim(p_client_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nombre inválido');
  END IF;
  IF p_client_phone IS NULL OR length(btrim(p_client_phone)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teléfono inválido');
  END IF;
  IF p_date IS NULL OR p_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fecha inválida');
  END IF;
  IF p_start_time IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Horario inválido');
  END IF;

  -- Negocio activo
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Negocio no disponible');
  END IF;

  -- Servicio del negocio y activo
  SELECT s.duration, s.price INTO v_duration, v_price
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.business_id = p_business_id
    AND s.is_active = true;

  IF v_duration IS NULL OR v_duration <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Servicio no disponible');
  END IF;

  -- Sucursal del negocio y activa
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_branch_id AND business_id = p_business_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sucursal no disponible');
  END IF;

  v_end_time := (p_start_time + (v_duration || ' minutes')::interval)::time;
  IF v_end_time <= p_start_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'Horario inválido');
  END IF;

  -- Feriados / cierres
  IF EXISTS (
    SELECT 1 FROM public.business_holidays
    WHERE business_id = p_business_id AND date = p_date AND is_closed = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'El negocio está cerrado ese día');
  END IF;

  -- Selección de barbero (con bloqueo de fila)
  IF p_barber_id IS NULL THEN
    SELECT b.id, b.branch_id INTO v_barber_id, v_barber_branch
    FROM public.barbers b
    WHERE b.business_id = p_business_id
      AND b.is_active = true
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id OR b.branch_id IS NULL)
      -- Solo barberos que realizan el servicio (sin configuración = todos)
      AND (
        NOT EXISTS (SELECT 1 FROM public.barber_services x WHERE x.barber_id = b.id)
        OR EXISTS (
          SELECT 1 FROM public.barber_services x
          WHERE x.barber_id = b.id AND x.service_id = p_service_id
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
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
    SELECT b.id, b.branch_id INTO v_barber_id, v_barber_branch
    FROM public.barbers b
    WHERE b.id = p_barber_id
      AND b.business_id = p_business_id
      AND b.is_active = true
    FOR UPDATE OF b;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Barbero no disponible');
    END IF;

    IF p_branch_id IS NOT NULL
       AND v_barber_branch IS NOT NULL
       AND v_barber_branch <> p_branch_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'El barbero no trabaja en esa sucursal');
    END IF;

    SELECT COUNT(*) INTO v_existing
    FROM public.appointments a
    WHERE a.barber_id = v_barber_id
      AND a.date = p_date
      AND a.status NOT IN ('cancelled', 'no_show')
      AND a.start_time < v_end_time
      AND a.end_time > p_start_time;

    IF v_existing > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Horario no disponible');
    END IF;
  END IF;

  IF v_barber_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay barberos disponibles en ese horario');
  END IF;

  -- Vacaciones del barbero
  IF EXISTS (
    SELECT 1 FROM public.barber_vacations bv
    WHERE bv.barber_id = v_barber_id
      AND p_date BETWEEN bv.start_date AND bv.end_date
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'El barbero no está disponible esa fecha');
  END IF;

  -- Servicio habilitado para el barbero (solo si el barbero tiene configuración)
  IF EXISTS (SELECT 1 FROM public.barber_services bs WHERE bs.barber_id = v_barber_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.barber_services bs
       WHERE bs.barber_id = v_barber_id AND bs.service_id = p_service_id
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'El barbero no realiza ese servicio');
  END IF;

  -- Horario laboral (si existe configuración para la sucursal o el negocio)
  v_day := EXTRACT(ISODOW FROM p_date)::integer;
  v_branch_scope := COALESCE(p_branch_id, v_barber_branch);

  SELECT bh.open_time, bh.close_time, bh.is_closed
    INTO v_open_time, v_close_time, v_is_closed
  FROM public.business_hours bh
  WHERE bh.business_id = p_business_id
    AND bh.day_of_week = v_day
    AND (
      (v_branch_scope IS NOT NULL AND (bh.branch_id = v_branch_scope OR bh.branch_id IS NULL))
      OR (v_branch_scope IS NULL AND bh.branch_id IS NULL)
    )
  ORDER BY (bh.branch_id IS NOT NULL) DESC
  LIMIT 1;

  v_hours_found := FOUND;

  IF v_hours_found THEN
    IF v_is_closed THEN
      RETURN jsonb_build_object('success', false, 'error', 'El negocio está cerrado ese día');
    END IF;
    IF p_start_time < v_open_time OR v_end_time > v_close_time THEN
      RETURN jsonb_build_object('success', false, 'error', 'Horario fuera de atención');
    END IF;
  END IF;

  -- Productos: pertenencia al negocio, estado, stock y precio desde la DB.
  IF array_length(p_product_ids, 1) IS NOT NULL THEN
    IF array_length(p_product_quantities, 1) IS DISTINCT FROM array_length(p_product_ids, 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cantidades de productos inválidas');
    END IF;

    FOR v_i IN 1..array_length(p_product_ids, 1) LOOP
      v_qty := COALESCE(p_product_quantities[v_i], 0);
      IF v_qty <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cantidad de producto inválida');
      END IF;

      SELECT ip.price, ip.current_stock, ip.name
        INTO v_product_price, v_product_stock, v_product_name
      FROM public.inventory_products ip
      WHERE ip.id = p_product_ids[v_i]
        AND ip.business_id = p_business_id
        AND ip.is_active = true
        AND ip.is_product = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Producto no disponible');
      END IF;

      IF v_product_stock < v_qty THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Stock insuficiente para "' || v_product_name || '"'
        );
      END IF;

      v_products_total := v_products_total + (v_product_price * v_qty);
    END LOOP;
  END IF;

  -- Cliente: reutiliza por teléfono dentro del negocio
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.business_id = p_business_id AND c.phone = btrim(p_client_phone)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (business_id, name, phone, email)
    VALUES (
      p_business_id,
      btrim(p_client_name),
      btrim(p_client_phone),
      NULLIF(btrim(COALESCE(p_client_email, '')), '')
    )
    RETURNING id INTO v_client_id;
  END IF;

  v_total := v_price + v_products_total;

  INSERT INTO public.appointments (
    business_id, branch_id, client_id, barber_id, date, start_time, end_time, status, total
  ) VALUES (
    p_business_id, p_branch_id, v_client_id, v_barber_id, p_date, p_start_time, v_end_time, 'pending', v_total
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.appointment_services (appointment_id, service_id, price)
  VALUES (v_appointment_id, p_service_id, v_price);

  IF array_length(p_product_ids, 1) IS NOT NULL THEN
    FOR v_i IN 1..array_length(p_product_ids, 1) LOOP
      SELECT ip.price INTO v_product_price
      FROM public.inventory_products ip
      WHERE ip.id = p_product_ids[v_i];

      INSERT INTO public.appointment_products (appointment_id, product_id, quantity, price)
      VALUES (v_appointment_id, p_product_ids[v_i], p_product_quantities[v_i], v_product_price);

      UPDATE public.inventory_products
      SET current_stock = current_stock - p_product_quantities[v_i]
      WHERE id = p_product_ids[v_i];
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'barber_id', v_barber_id,
    'end_time', v_end_time,
    'total', v_total
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Completar reserva: autorización + stock atómico (sin cambios parciales)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id uuid,
  p_completed_products jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_business_id    uuid;
  v_start_status   text;
  v_total          numeric(12,2);
  v_product        record;
  v_completed_ids  uuid[];
  v_product_id     uuid;
  v_current_stock  integer;
  v_product_name   text;
  v_old_qty        integer;
  v_new_qty        integer;
  v_uid            uuid := auth.uid();
BEGIN
  SELECT a.business_id, a.status INTO v_business_id, v_start_status
  FROM public.appointments a
  WHERE a.id = p_appointment_id
  FOR UPDATE;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Autorización: superadmin o personal del negocio (admin/barbero).
  -- Se acepta tanto el claim del JWT (misma fuente que usan las políticas RLS)
  -- como la fila en business_staff: hay usuarios creados sólo con
  -- app_metadata que no tienen fila de staff y no deben quedar bloqueados.
  IF v_uid IS NULL OR NOT (
    public.is_super_admin()
    OR (
      public.current_user_business_id() = v_business_id
      AND public.current_user_role() IN ('business_admin', 'barber')
    )
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.user_id = v_uid
        AND bs.business_id = v_business_id
        AND bs.is_active = true
        AND bs.role IN ('business_admin', 'barber')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  SELECT ARRAY(
    SELECT (jsonb_array_elements(p_completed_products)->>'id')::uuid
  ) INTO v_completed_ids;

  -- 1) Validar TODO antes de mutar
  FOR v_product IN
    SELECT * FROM jsonb_to_recordset(p_completed_products) AS x(id uuid, quantity integer)
  LOOP
    SELECT ap.product_id, ap.quantity
      INTO v_product_id, v_old_qty
    FROM public.appointment_products ap
    WHERE ap.id = v_product.id AND ap.appointment_id = p_appointment_id;

    IF v_product_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado en la reserva');
    END IF;

    SELECT ip.current_stock, ip.name
      INTO v_current_stock, v_product_name
    FROM public.inventory_products ip
    WHERE ip.id = v_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado');
    END IF;

    v_new_qty := COALESCE(v_product.quantity, 0);
    IF v_new_qty < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cantidad inválida');
    END IF;

    -- Solo se descuenta la diferencia adicional
    IF (v_new_qty - COALESCE(v_old_qty, 0)) > v_current_stock THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock insuficiente para "' || v_product_name || '"'
      );
    END IF;
  END LOOP;

  -- 2) Aplicar cambios
  -- Devolver al stock los productos descartados (solo si el stock estaba
  -- descontado; en reservas canceladas ya fue devuelto por trigger).
  IF v_start_status NOT IN ('cancelled', 'no_show') THEN
    FOR v_product IN
      SELECT ap.product_id, ap.quantity
      FROM public.appointment_products ap
      WHERE ap.appointment_id = p_appointment_id
        AND ap.id <> ALL (COALESCE(v_completed_ids, ARRAY[]::uuid[]))
    LOOP
      UPDATE public.inventory_products
      SET current_stock = current_stock + COALESCE(v_product.quantity, 0)
      WHERE id = v_product.product_id;
    END LOOP;
  END IF;

  DELETE FROM public.appointment_products
  WHERE appointment_id = p_appointment_id
    AND id <> ALL (COALESCE(v_completed_ids, ARRAY[]::uuid[]));

  FOR v_product IN
    SELECT * FROM jsonb_to_recordset(p_completed_products) AS x(id uuid, quantity integer)
  LOOP
    SELECT ap.product_id, ap.quantity
      INTO v_product_id, v_old_qty
    FROM public.appointment_products ap
    WHERE ap.id = v_product.id;

    v_new_qty := COALESCE(v_product.quantity, 0);

    UPDATE public.appointment_products
    SET quantity = v_new_qty
    WHERE id = v_product.id;

    UPDATE public.inventory_products
    SET current_stock = current_stock - (v_new_qty - COALESCE(v_old_qty, 0))
    WHERE id = v_product_id;
  END LOOP;

  SELECT COALESCE(SUM(aps.price), 0) INTO v_total
  FROM public.appointment_services aps
  WHERE aps.appointment_id = p_appointment_id;

  v_total := v_total + COALESCE((
    SELECT SUM(ap.price * ap.quantity)
    FROM public.appointment_products ap
    WHERE ap.appointment_id = p_appointment_id
  ), 0);

  UPDATE public.appointments
  SET status = 'completed', total = v_total, updated_at = now()
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 4b. Sincronizar stock cuando cambia el estado de la reserva
--     - Cancela / no_show: devuelve los productos al stock.
--     - Reactiva desde cancelada: vuelve a descontar (valida stock).
--     - Elimina reserva: devuelve los productos al stock.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_stock_on_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_restore boolean := false;
  v_deduct  boolean := false;
  v_appt_id uuid := COALESCE(NEW.id, OLD.id);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_restore := OLD.status NOT IN ('cancelled', 'no_show');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('cancelled', 'no_show')
       AND OLD.status NOT IN ('cancelled', 'no_show') THEN
      v_restore := true;
    ELSIF OLD.status IN ('cancelled', 'no_show')
          AND NEW.status NOT IN ('cancelled', 'no_show') THEN
      v_deduct := true;
    END IF;
  END IF;

  IF v_restore THEN
    UPDATE public.inventory_products ip
    SET current_stock = ip.current_stock + ap.quantity
    FROM public.appointment_products ap
    WHERE ap.appointment_id = v_appt_id
      AND ip.id = ap.product_id;
  ELSIF v_deduct THEN
    IF EXISTS (
      SELECT 1
      FROM public.appointment_products ap
      JOIN public.inventory_products ip ON ip.id = ap.product_id
      WHERE ap.appointment_id = v_appt_id
        AND ip.current_stock < ap.quantity
    ) THEN
      RAISE EXCEPTION 'Stock insuficiente para reactivar la reserva';
    END IF;

    UPDATE public.inventory_products ip
    SET current_stock = ip.current_stock - ap.quantity
    FROM public.appointment_products ap
    WHERE ap.appointment_id = v_appt_id
      AND ip.id = ap.product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_stock_on_appointment ON public.appointments;
CREATE TRIGGER trg_sync_stock_on_appointment
  AFTER UPDATE OF status OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_stock_on_appointment_change();

-- ---------------------------------------------------------------------------
-- 4c. Notificación de nueva reserva (P0: estaba roto en producción)
--     La función insertaba en columnas inexistentes (user_id/title/body/data)
--     y corría como INVOKER, por lo que `anon` no podía insertar bajo RLS:
--     CUALQUIER alta de reserva fallaba. Se reescribe contra el esquema real
--     y se blinda para que un fallo de notificación nunca bloquee la reserva.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.notifications (
    business_id, type, recipient, message, status, reference_type, reference_id
  )
  SELECT
    NEW.business_id,
    'appointment',
    COALESCE(NULLIF(b.phone, ''), u.email, bs.user_id::text),
    COALESCE(c.name, 'Cliente') || ' — ' ||
      to_char(NEW.date, 'DD/MM') || ', ' ||
      substring(NEW.start_time::text, 1, 5) || ' hs',
    'pending',
    'appointment',
    NEW.id
  FROM public.business_staff bs
  JOIN public.barbers b ON b.id = bs.barber_id
  LEFT JOIN auth.users u ON u.id = bs.user_id
  LEFT JOIN public.clients c ON c.id = NEW.client_id
  WHERE bs.business_id = NEW.business_id
    AND bs.role = 'barber'
    AND bs.is_active = true;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- La notificación es secundaria: jamás debe impedir crear una reserva.
  RAISE WARNING 'notify_new_appointment: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- Barberos del negocio pueden leer notificaciones de su negocio (cola operativa).
-- Idempotente: política aditiva, no elimina las existentes de admin/super_admin.
DROP POLICY IF EXISTS barber_read_notifications ON public.notifications;
CREATE POLICY barber_read_notifications ON public.notifications
  FOR SELECT
  USING (
    current_user_role() = 'barber'
    AND business_id = current_user_business_id()
  );

-- ---------------------------------------------------------------------------
-- 5. Recálculo de total sin producto cartesiano
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalc_appointment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_appointment_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'appointment_services' THEN
    v_appointment_id := COALESCE(NEW.appointment_id, OLD.appointment_id);
  ELSIF TG_TABLE_NAME = 'appointment_products' THEN
    v_appointment_id := COALESCE(NEW.appointment_id, OLD.appointment_id);
  END IF;

  IF v_appointment_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.appointments
  SET total =
    COALESCE((
      SELECT SUM(aps.price) FROM public.appointment_services aps
      WHERE aps.appointment_id = v_appointment_id
    ), 0)
    +
    COALESCE((
      SELECT SUM(ap.price * ap.quantity) FROM public.appointment_products ap
      WHERE ap.appointment_id = v_appointment_id
    ), 0)
  WHERE id = v_appointment_id;

  RETURN COALESCE(NEW, OLD);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Anti-spam por negocio (no global entre negocios)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_booking_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_client_phone text;
  v_recent_count integer;
BEGIN
  SELECT c.phone INTO v_client_phone
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  IF v_client_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.appointments a
  JOIN public.clients c ON c.id = a.client_id
  WHERE a.business_id = NEW.business_id
    AND c.phone = v_client_phone
    AND a.created_at > now() - interval '2 hours'
    AND a.status NOT IN ('cancelled', 'no_show');

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Demasiadas reservas desde este número. Intentá de nuevo más tarde.';
  END IF;

  RETURN NEW;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Límites de plan consistentes (contar solo activos)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_barber_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan_slug text;
  v_max integer;
  v_count integer;
BEGIN
  SELECT b.plan INTO v_plan_slug FROM public.businesses b WHERE b.id = NEW.business_id;
  IF v_plan_slug IS NULL THEN
    RAISE EXCEPTION 'Negocio sin plan asignado';
  END IF;

  SELECT p.max_barbers INTO v_max FROM public.plans p WHERE p.slug = v_plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado';
  END IF;

  IF v_max IS NOT NULL AND v_max < 999999 THEN
    SELECT COUNT(*) INTO v_count
    FROM public.barbers b
    WHERE b.business_id = NEW.business_id AND b.is_active = true;

    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Limite de barberos alcanzado para el plan actual';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.enforce_branch_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_plan_slug text;
  v_max integer;
  v_count integer;
BEGIN
  SELECT b.plan INTO v_plan_slug FROM public.businesses b WHERE b.id = NEW.business_id;
  IF v_plan_slug IS NULL THEN
    RAISE EXCEPTION 'Negocio sin plan asignado';
  END IF;

  SELECT p.max_branches INTO v_max FROM public.plans p WHERE p.slug = v_plan_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado';
  END IF;

  IF v_max IS NOT NULL AND v_max < 999999 THEN
    SELECT COUNT(*) INTO v_count
    FROM public.branches br
    WHERE br.business_id = NEW.business_id AND br.is_active = true;

    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Limite de sucursales alcanzado para el plan actual';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

-- Un único mecanismo por límite (había dos triggers para barberos) y también
-- al reactivar un registro (antes solo se validaba el INSERT).
-- Nota: TG_OP/OLD no son utilizables en la cláusula WHEN de un BEFORE INSERT,
-- por eso se separan INSERT y UPDATE.
DROP TRIGGER IF EXISTS trg_check_barber_limit ON public.barbers;
DROP TRIGGER IF EXISTS trg_enforce_barber_limit ON public.barbers;
DROP TRIGGER IF EXISTS trg_enforce_barber_limit_insert ON public.barbers;
DROP TRIGGER IF EXISTS trg_enforce_barber_limit_reactivate ON public.barbers;

CREATE TRIGGER trg_enforce_barber_limit_insert
  BEFORE INSERT ON public.barbers
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.enforce_barber_limit();

CREATE TRIGGER trg_enforce_barber_limit_reactivate
  BEFORE UPDATE OF is_active ON public.barbers
  FOR EACH ROW
  WHEN (NEW.is_active = true AND OLD.is_active = false)
  EXECUTE FUNCTION public.enforce_barber_limit();

DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON public.branches;
DROP TRIGGER IF EXISTS trg_enforce_branch_limit_insert ON public.branches;
DROP TRIGGER IF EXISTS trg_enforce_branch_limit_reactivate ON public.branches;

CREATE TRIGGER trg_enforce_branch_limit_insert
  BEFORE INSERT ON public.branches
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.enforce_branch_limit();

CREATE TRIGGER trg_enforce_branch_limit_reactivate
  BEFORE UPDATE OF is_active ON public.branches
  FOR EACH ROW
  WHEN (NEW.is_active = true AND OLD.is_active = false)
  EXECUTE FUNCTION public.enforce_branch_limit();

-- ---------------------------------------------------------------------------
-- 7b. Ajuste de stock atómico con trazabilidad
--     (antes el frontend hacía UPDATE directo con el valor calculado en el
--      cliente: pérdida de actualizaciones concurrentes y sin movimiento)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_product_id uuid,
  p_delta      integer,
  p_notes      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_business_id uuid;
  v_new_stock   integer;
  v_name        text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  SELECT ip.business_id, ip.name
    INTO v_business_id, v_name
  FROM public.inventory_products ip
  WHERE ip.id = p_product_id
  FOR UPDATE;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.current_user_business_id() = v_business_id
      AND public.current_user_role() = 'business_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.user_id = auth.uid()
        AND bs.business_id = v_business_id
        AND bs.is_active = true
        AND bs.role = 'business_admin'
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cantidad inválida');
  END IF;

  UPDATE public.inventory_products
  SET current_stock = current_stock + p_delta
  WHERE id = p_product_id
    AND current_stock + p_delta >= 0
  RETURNING current_stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stock insuficiente para "' || v_name || '"'
    );
  END IF;

  INSERT INTO public.inventory_movements (product_id, type, quantity, notes, created_by)
  VALUES (
    p_product_id,
    CASE WHEN p_delta > 0 THEN 'in' ELSE 'out' END,
    abs(p_delta),
    p_notes,
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'current_stock', v_new_stock);
END;
$fn$;

-- Un solo registro de caja abierto por negocio (0 duplicados verificados).
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_register_one_open_per_business
  ON public.cash_register (business_id)
  WHERE is_open = true;

-- ---------------------------------------------------------------------------
-- 8. Garantía de no solapamiento a nivel de base de datos
--    (0 solapamientos verificados en producción antes de crear la restricción)
-- ---------------------------------------------------------------------------

-- btree_gist vive en el esquema `extensions` (convención Supabase) y ya está
-- incluido en el search_path del proyecto, por lo que las opclasses de GiST
-- para uuid se resuelven correctamente al crear la restricción.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    barber_id WITH =,
    tsrange((date + start_time)::timestamp, (date + end_time)::timestamp) WITH &&
  )
  WHERE (
    barber_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show')
  );

-- ---------------------------------------------------------------------------
-- 9. Permisos EXECUTE: cerrar funciones internas para anon
-- ---------------------------------------------------------------------------

-- Reserva pública: explícitamente anon + authenticated
REVOKE ALL ON FUNCTION public.create_appointment_atomic(uuid, uuid, uuid, text, text, text, date, time, uuid, uuid[], integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(uuid, uuid, uuid, text, text, text, date, time, uuid, uuid[], integer[]) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_busy_slots(uuid, date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid, date, uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_queue(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_queue(uuid, uuid, date) TO anon, authenticated, service_role;

-- Operaciones internas: nunca anónimas
REVOKE ALL ON FUNCTION public.complete_appointment(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_appointment(uuid, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.adjust_inventory_stock(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(uuid, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.transfer_appointment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_appointment(uuid) TO authenticated, service_role;

-- Funciones de trigger / event trigger: no invocables por clientes
REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_cash_on_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_barber_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_booking_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_booking_spam() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_barber_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_branch_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_cash_module_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_module_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_appointment_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_stock_on_appointment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_branches_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_appointment() FROM PUBLIC, anon, authenticated;

-- Helpers de planes: solo autenticados (los triggers los usan como owner)
REVOKE ALL ON FUNCTION public.get_plan_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_limits(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.plan_has_feature(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_has_feature(uuid, text) TO authenticated, service_role;

-- NOTA: is_super_admin() y current_user_*() NO se revocan de anon porque
-- policies con role {public} las referencian y PostgreSQL exige EXECUTE para
-- evaluarlas. Son seguras: devuelven false/NULL para anon.

-- ---------------------------------------------------------------------------
-- 10. Columnas de barberos: ocultar email/teléfono a anon (PII de empleados)
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.barbers FROM anon;
GRANT SELECT (
  id, business_id, name, photo_url, specialty, color_hex, is_active, branch_id, created_at
) ON public.barbers TO anon;

-- ---------------------------------------------------------------------------
-- 11. Índices de apoyo para políticas RLS y consultas públicas
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_appointments_business_date
  ON public.appointments (business_id, date);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appt
  ON public.appointment_services (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_products_appt
  ON public.appointment_products (appointment_id);

CREATE INDEX IF NOT EXISTS idx_business_staff_user_business
  ON public.business_staff (user_id, business_id);

COMMIT;
