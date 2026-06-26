# Plan de Fixes — BarberShifts

> Archivo generado el 2026-06-25 por auditoría completa.
> Usar como entrada única para la próxima sesión de IA.

---

## Estado actual del proyecto

- **Stack**: React (JS) + Vite + Supabase (PostgreSQL)
- **Proyecto**: Sistema de barberías con reservas, inventario y productos vendibles
- **Host**: Render (frontend build), Supabase (DB y backend)
- **DB**: PostgreSQL en Supabase (project ref: `mrktwxjlltqqxkvktkku`, West US Oregon)
- **Build**: ✅ Compila sin errores

### Archivos clave del proyecto

```
C:\Users\ASUS\Desktop\Proyectos\negocios\
├── frontend/                          # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AppointmentsPage.jsx    # Admin gestiona reservas
│   │   │   │   ├── InventoryPage.jsx       # Admin gestiona inventario/productos
│   │   │   │   ├── ConfigPage.jsx          # Admin configura negocio
│   │   │   │   └── ...
│   │   │   ├── barber/
│   │   │   │   └── BarberDashboard.jsx     # Barbero gestiona sus reservas
│   │   │   ├── barberia/
│   │   │   │   ├── BarberiaPage.jsx        # Página pública de la barbería
│   │   │   │   └── BookingPage.jsx         # Booking con productos (step 5)
│   │   │   └── public/
│   │   │       └── Marketplace.jsx         # Marketplace público
│   │   ├── components/
│   │   │   ├── CompleteAppointmentModal.jsx  # Modal de completar compartido
│   │   │   └── ui/
│   │   └── utils/
│   │       └── format.js                  # fmtCurrency con Intl
│   └── .env                               # Variables Supabase
├── supabase/
│   └── migrations/                        # Migraciones SQL
└── FIXES.md                               # ← Este archivo
```

### Base de datos (PostgreSQL)

**Funciones existentes:**
```
auto_cash_on_completion, check_barber_limit, check_booking_limit,
check_cash_module_access, check_module_access, complete_appointment,
current_user_business_id, current_user_id, current_user_role,
get_plan_limits, is_super_admin, plan_has_feature,
recalc_appointment_total, rls_auto_enable, transfer_appointment,
update_updated_at
```

**Migraciones aplicadas (12 archivos):**
```
20260615000001_schema.sql
20260615000002_rls.sql
20260615000003_seed.sql
20260615000004_fix_template_id_type.sql
20260615200001_fix_column_mismatches.sql
20260615200002_fix_rls_public_insert.sql
20260615200003_prevent_double_booking.sql
20260621000001_fix_plan_slugs_english.sql
20260622000001_transfer_appointment.sql
20260625180000_productos_en_reserva.sql
20260625200001_add_google_maps_url.sql
20260625200002_complete_appointment_function.sql
```

**Tabla `inventory_products`:**
```sql
id UUID PK, business_id UUID FK, name TEXT, description TEXT,
price DECIMAL(10,2), current_stock INT DEFAULT 0, min_stock INT DEFAULT 5,
created_at TIMESTAMPTZ, unit TEXT DEFAULT 'pieza',
is_product BOOLEAN DEFAULT false, image_url TEXT, is_active BOOLEAN DEFAULT true
```

**Tabla `appointment_products`:**
```sql
id UUID PK, appointment_id UUID FK→appointments(id) ON DELETE CASCADE,
product_id UUID FK→inventory_products(id) ON DELETE RESTRICT,
quantity INT NOT NULL DEFAULT 1 CHECK (>0),
price DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
```

---

## 🔴 FIX 1 — Stock negativo en `complete_appointment`

### Problema
La RPC `complete_appointment` descuenta stock sin verificar `current_stock >= quantity`. Si el barbero confirma más cantidad de la disponible, el stock queda negativo.

### Archivos a modificar
- `supabase/migrations/20260625200002_complete_appointment_function.sql` (todo el archivo)

### Código actual (función completa)
```sql
CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id UUID,
  p_completed_products JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id UUID;
  v_total DECIMAL(10,2);
  v_product RECORD;
  v_completed_ids UUID[];
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
    DECLARE
      v_product_id UUID;
    BEGIN
      SELECT product_id INTO v_product_id
      FROM appointment_products
      WHERE id = v_product.id;

      UPDATE appointment_products
      SET quantity = v_product.quantity
      WHERE id = v_product.id;

      UPDATE inventory_products
      SET current_stock = current_stock - v_product.quantity
      WHERE id = v_product_id;
    END;
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
```

### Fix requerido
1. Agregar `SET search_path = public` después de `SECURITY DEFINER`
2. Validar que `v_product_id` no sea NULL (si el ID de appointment_products no existe)
3. Validar `current_stock >= v_product.quantity` ANTES de descontar
4. Si alguna validación falla, retornar error (no RAISE)

### SQL de reemplazo
```sql
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

    SELECT current_stock INTO v_current_stock
    FROM inventory_products
    WHERE id = v_product_id;

    IF v_current_stock < v_product.quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente para ' || (SELECT name FROM inventory_products WHERE id = v_product_id));
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
```

### Cómo aplicar
```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
# Escribir el SQL a un archivo temporal y ejecutar
supabase db query --linked --file "ruta/al/archivo.sql"
```

---

## 🔴 FIX 2 — Reescribir `recalc_appointment_total` para incluir productos

### Problema
La función `recalc_appointment_total` (de la migración 1) solo suma `appointment_services`. El trigger `trg_recalc_total` en `appointment_services` actualiza el total, pero `appointment_products` no tiene triggers. Si se insertan/borran productos de una reserva, el total queda desactualizado hasta que se complete.

### Archivos a modificar
- Crear nueva migración: `supabase/migrations/20260626000001_fix_recalc_total.sql`

### SQL de reemplazo para `recalc_appointment_total`
```sql
CREATE OR REPLACE FUNCTION recalc_appointment_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
BEGIN
  -- Determine the appointment_id from the triggering table
  IF TG_TABLE_NAME = 'appointment_services' THEN
    v_appointment_id := NEW.appointment_id;
    IF v_appointment_id IS NULL THEN
      v_appointment_id := OLD.appointment_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'appointment_products' THEN
    v_appointment_id := NEW.appointment_id;
    IF v_appointment_id IS NULL THEN
      v_appointment_id := OLD.appointment_id;
    END IF;
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

-- Drop existing triggers on appointment_services
DROP TRIGGER IF EXISTS trg_recalc_total_insert ON appointment_services;
DROP TRIGGER IF EXISTS trg_recalc_total_update ON appointment_services;
DROP TRIGGER IF EXISTS trg_recalc_total_delete ON appointment_services;

-- Re-create triggers on appointment_services
CREATE TRIGGER trg_recalc_total_insert
  AFTER INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_update
  AFTER UPDATE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_delete
  AFTER DELETE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

-- Add triggers on appointment_products
CREATE TRIGGER trg_recalc_total_product_insert
  AFTER INSERT ON appointment_products
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();

CREATE TRIGGER trg_recalc_total_product_delete
  AFTER DELETE ON appointment_products
  FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total();
```

---

## 🔴 FIX 3 — RLS de `super_admins` está roto

### Problema
La tabla `super_admins` tiene RLS habilitado pero cero políticas. Cualquier policy que haga `EXISTS (SELECT 1 FROM super_admins WHERE id = auth.uid())` retorna falso siempre.

### Archivos a modificar
- Crear nueva migración: `supabase/migrations/20260626000002_fix_super_admin_rls.sql`

### SQL
```sql
-- Allow super admins to read themselves (needed for RLS subqueries)
CREATE POLICY "super_admin_select_self" ON super_admins
  FOR SELECT USING (true);

-- Allow super admins to manage their own row
CREATE POLICY "super_admin_update_self" ON super_admins
  FOR UPDATE USING (id = auth.uid());
```

O, si se prefiere más simple:
```sql
-- Disable RLS on super_admins since it's a small admin table
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;
```

---

## 🔴 FIX 4 — Crear migración consolidada con todos los fixes de DB

### Problema
Hacer 3 migraciones separadas es frágil. Mejor una sola migración atómica.

### Archivo a crear
`supabase/migrations/20260626000003_fix_audit_critical.sql`

### Contenido
```sql
-- ============================================================
-- Fix #1: complete_appointment con validaciones + search_path
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

    SELECT current_stock INTO v_current_stock
    FROM inventory_products
    WHERE id = v_product_id;

    IF v_current_stock < v_product.quantity THEN
      RETURN jsonb_build_object('success', false, 'error',
        'Stock insuficiente. Disponible: ' || v_current_stock || ', solicitado: ' || v_product.quantity);
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
-- Fix #2: recalc_appointment_total con appointment_products
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
-- Fix #3: Super admin RLS
-- ============================================================
CREATE POLICY IF NOT EXISTS "super_admin_select_self" ON super_admins
  FOR SELECT USING (true);

-- ============================================================
-- Fix #4: CHECK constraint to prevent negative stock
-- ============================================================
ALTER TABLE inventory_products
  DROP CONSTRAINT IF EXISTS check_current_stock_non_negative,
  ADD CONSTRAINT check_current_stock_non_negative
  CHECK (current_stock >= 0);

-- ============================================================
-- Fix #5: Index on appointment_products.product_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointment_products_product
  ON appointment_products(product_id);

-- ============================================================
-- Fix #6: NOT NULL + DEFAULT on appointment_products.created_at
-- ============================================================
ALTER TABLE appointment_products
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
```

### Cómo aplicar
```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
# Opción 1: directo
supabase db query --linked --file "supabase/migrations/20260626000003_fix_audit_critical.sql"

# Opción 2: si falla el --linked, usar el SQL Editor del Dashboard de Supabase:
# 1. Ir a https://supabase.com/dashboard/project/mrktwxjlltqqxkvktkku
# 2. SQL Editor → New Query
# 3. Pegar el contenido del archivo
# 4. Run
```

---

## 🟠 FIX 5 — `innerHTML` con interpolación en BarberiaPage

### Archivo
`frontend/src/pages/barberia/BarberiaPage.jsx`

### Línea actual (~318)
```jsx
onError={(e) => {
  e.target.style.display = 'none'
  e.target.parentElement.innerHTML = `<div class="flex items-center justify-center h-full text-2xl font-bold" style="color:${colors.accent}44">${product.name.charAt(0)}</div>`
}}
```

### Fix
Reemplazar por manipulación condicional del DOM en lugar de innerHTML:

```jsx
// En el state del componente o en el map
const [imgErrors, setImgErrors] = useState({})

// En el JSX del producto
<div className="h-32 flex items-center justify-center overflow-hidden bg-gray-50">
  {product.image_url && !imgErrors[product.id] ? (
    <img
      src={product.image_url}
      alt={product.name}
      className="h-full w-full object-cover"
      onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
    />
  ) : (
    <span className="text-2xl font-bold" style={{ color: `${colors.accent}44` }}>
      {product.name.charAt(0)}
    </span>
  )}
</div>
```

Este mismo patrón existe en `BookingPage.jsx` (~696-705) — aplicar el mismo fix allí también.

---

## 🟠 FIX 6 — Plan gating explícito en BookingPage step 5

### Archivo
`frontend/src/pages/barberia/BookingPage.jsx`

### Línea actual (~237-245)
```jsx
// Carga de productos sin verificar plan
```

### Fix
Agregar verificación de plan antes de mostrar step 5:

```jsx
// Después de cargar products:
const showProductStep = planName !== 'basic' && products.length > 0

// En el render condicional del step 5:
{step === 5 && showProductStep && (
  // ... contenido del step
)}
{step === 5 && !showProductStep && (
  // Saltar automáticamente al step 6
  setStep(6)
)}
```

Necesita importar `usePlan` si no está ya:
```jsx
import { usePlan } from '../../hooks/usePlan'
// ...
const { planName } = usePlan()
```

---

## 🟠 FIX 7 — Botón "Limpiar filtros" no refresca

### Archivo
`frontend/src/pages/admin/AppointmentsPage.jsx`

### Línea actual (~237-241)
```jsx
{(statusFilter || dateFilter) && (
  <button
    onClick={() => { setStatusFilter(''); setDateFilter('') }}
    className="text-sm text-gray-500 hover:text-gray-700"
  >
    Limpiar filtros
  </button>
)}
```

### Fix
Agregar llamada a `fetchAppointments()` después de limpiar:

```jsx
<button
  onClick={() => {
    setStatusFilter('')
    setDateFilter('')
    setTimeout(fetchAppointments, 0) // setTimeout para que los setState se procesen
  }}
  className="text-sm text-gray-500 hover:text-gray-700"
>
  Limpiar filtros
</button>
```

O mejor, usar useEffect que reaccione a cambios en statusFilter/dateFilter:

```jsx
useEffect(() => {
  if (businessId) fetchAppointments()
}, [businessId, statusFilter, dateFilter])
```

---

## 🟠 FIX 8 — Fallback locale `es-PY` en format.js

### Archivo
`frontend/src/utils/format.js`

### Fix
```jsx
export function fmtCurrency(amount) {
  if (amount == null || isNaN(amount)) return '₲ 0'
  try {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount))
  } catch {
    // Fallback si es-PY no está disponible
    return `₲ ${Number(amount).toLocaleString('es-ES')}`
  }
}
```

---

## 🔵 FIXES MENORES

### 9. Import no usado `getAnimationStyle`
**Archivos:** `BarberiaPage.jsx:4`, `BookingPage.jsx:4`
**Fix:** Eliminar el import.

### 10. `client_name` duplicado en BarberDashboard
**Archivo:** `BarberDashboard.jsx:207`
```jsx
const clientName = a.client_name || (a.client?.name) || a.client_name || 'Cliente'
//                              ^^^^^^^^^^^^^^ repetido                ^^^^^^^^^^^^^^
```
**Fix:** 
```jsx
const clientName = a.client?.name || a.client_name || 'Cliente'
```

### 11. Agregar `client:client_id(name, phone)` en query de reservas propias del barbero
**Archivo:** `BarberDashboard.jsx:74`
**Fix:** Agregar `client:client_id(name, phone)` al select de myRes.

### 12. `lowStockProducts` calculado antes de early returns
**Archivo:** `InventoryPage.jsx:~202`
**Fix:** Mover el cálculo después de los early returns o usar lazy evaluation.

---

## 🧪 Cómo verificar los fixes

### Después de aplicar migraciones SQL
```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios

# Verificar función complete_appointment
supabase db query --linked "SELECT prosrc FROM pg_proc WHERE proname = 'complete_appointment'" 2>&1 | Select-String -Pattern "search_path|current_stock <|v_product_id IS NULL"

# Verificar función recalc_appointment_total
supabase db query --linked "SELECT prosrc FROM pg_proc WHERE proname = 'recalc_appointment_total'" 2>&1

# Verificar triggers en appointment_products
supabase db query --linked "SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE event_object_table = 'appointment_products'"

# Verificar CHECK constraint
supabase db query --linked "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'inventory_products'::regclass AND contype = 'c'"

# Verificar RLS policy
supabase db query --linked "SELECT policyname FROM pg_policies WHERE tablename = 'super_admins'"

# Verificar índice
supabase db query --linked "SELECT indexname FROM pg_indexes WHERE tablename = 'appointment_products'"
```

### Después de aplicar fixes frontend
```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios\frontend
npm run build
```
El build debe salir con 0 errores.

### Probar flujo completo
1. Admin crea un producto con `is_product=true` y stock=5
2. Admin configura `google_maps_url` en ConfigPage
3. Desde el navegador en incógnito, como cliente:
   - Abrir BarberiaPage → ver producto en sección "Productos"
   - Ver address clickable (abre Google Maps) y phone (abre WhatsApp)
   - Reservar con 2 unidades del producto
4. Como barbero: completar la reserva
5. Verificar que stock bajó de 5 a 3
6. Como admin: repetir desde AppointmentsPage
7. Verificar que el total incluye servicio + producto
8. Intentar completar con más cantidad que el stock — debe mostrar error

---

## 📦 Resumen de archivos a crear/modificar

| # | Archivo | Acción | Severidad |
|---|---------|--------|-----------|
| 1 | `supabase/migrations/20260626000003_fix_audit_critical.sql` | **Crear** | 🔴 |
| 2 | `supabase/migrations/20260625200002_complete_appointment_function.sql` | Actualizar | 🔴 |
| 3 | `frontend/src/pages/barberia/BarberiaPage.jsx` | Fix innerHTML | 🟠 |
| 4 | `frontend/src/pages/barberia/BookingPage.jsx` | Fix innerHTML + plan gating | 🟠 |
| 5 | `frontend/src/pages/admin/AppointmentsPage.jsx` | Fix filtros refresh | 🟠 |
| 6 | `frontend/src/utils/format.js` | Fix locale fallback | 🟠 |
| 7 | `frontend/src/pages/barber/BarberDashboard.jsx` | Fix client_name + query | 🔵 |
| 8 | `frontend/src/pages/barberia/BarberiaPage.jsx` | Remove unused import | 🔵 |
| 9 | `frontend/src/pages/barberia/BookingPage.jsx` | Remove unused import | 🔵 |

---

## ⚠️ Notas importantes para la IA

1. **Siempre verificAR el build después de cambios** con `npm run build` en `frontend/`
2. **Los archivos SQL se ejecutan con** `supabase db query --linked --file "ruta/al/archivo.sql"` desde `C:\Users\ASUS\Desktop\Proyectos\negocios`
3. **No usar TypeScript** — todo es JavaScript
4. **No modificar** archivos que no están en la tabla de arriba
5. **Commit en español** y descriptivo
6. **No crear documentación** (.md) a menos que se pida explícitamente
7. **Si un fix SQL falla**, intentar desde el SQL Editor del Dashboard de Supabase
8. **DB credentials** están en `frontend/.env` si se necesita conexión directa (puerto 5432 bloqueado desde red local)
9. **Siempre leer el archivo ANTES de editarlo**
