# Completar Reserva — Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a completion modal for barbers/admins that lets them verify which services and products were actually completed when finishing an appointment. Stock decrements and price adjustment happen on confirmation.

**Architecture:** A shared `CompleteAppointmentModal` component + a PostgreSQL function `complete_appointment()` that atomically updates status, removes uncompleted products, adjusts stock, and recalculates total.

**Tech Stack:** Supabase (PostgreSQL), Flask (API), React (frontend), Tailwind CSS

---

### Task 1: DB Migration — complete_appointment function

**Files:**
- Create: `../supabase/migrations/20260625200002_complete_appointment_function.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Function to complete an appointment with item verification
CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id UUID,
  p_completed_products JSONB DEFAULT '[]' -- [{ "id": "uuid", "quantity": 1 }]
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
  -- Get business_id and verify appointment exists
  SELECT business_id INTO v_business_id FROM appointments WHERE id = p_appointment_id;
  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Build array of completed product IDs
  SELECT ARRAY_AGG((jsonb_array_elements(p_completed_products)->>'id')::UUID)
  INTO v_completed_ids;

  -- Delete appointment_products NOT in the completed list
  DELETE FROM appointment_products
  WHERE appointment_id = p_appointment_id
    AND id NOT IN (SELECT unnest(v_completed_ids));

  -- Update quantities and decrement stock for each completed product
  FOR v_product IN
    SELECT * FROM jsonb_to_recordset(p_completed_products) AS x(id UUID, quantity INT)
  LOOP
    -- Get old quantity to calculate stock difference
    DECLARE
      v_old_qty INT;
    BEGIN
      SELECT quantity INTO v_old_qty
      FROM appointment_products
      WHERE id = v_product.id;

      -- Update quantity
      UPDATE appointment_products
      SET quantity = v_product.quantity
      WHERE id = v_product.id;

      -- Decrement stock by difference (if quantity increased, decrement more; if decreased, "return" stock)
      UPDATE inventory_products
      SET current_stock = current_stock - (v_product.quantity - COALESCE(v_old_qty, 0))
      WHERE id = (SELECT product_id FROM appointment_products WHERE id = v_product.id);
    END;
  END LOOP;

  -- Recalculate total: services + remaining products
  SELECT COALESCE(SUM(s.price), 0) INTO v_total
  FROM appointment_services s
  WHERE s.appointment_id = p_appointment_id;

  v_total := v_total + COALESCE(
    (SELECT SUM(ap.price * ap.quantity) FROM appointment_products ap WHERE ap.appointment_id = p_appointment_id),
    0
  );

  -- Update appointment
  UPDATE appointments
  SET status = 'completed',
      total = v_total,
      updated_at = now()
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$$;
```

- [ ] **Step 2: Run migration**

```bash
cd negocios && Get-Content supabase/migrations/20260625200002_complete_appointment_function.sql | supabase db query --linked
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add ../supabase/migrations/20260625200002_complete_appointment_function.sql
cd frontend && git commit -m "feat: add complete_appointment function"
```

---

### Task 2: Create CompleteAppointmentModal component

**Files:**
- Create: `src/components/CompleteAppointmentModal.jsx`

- [ ] **Step 1: Create the modal component**

```jsx
import { useState } from 'react'
import Button from './ui/Button'
import { fmtCurrency } from '../utils/format'

function MinusIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

export default function CompleteAppointmentModal({ appointment, services, products, onConfirm, onClose }) {
  const [checkedProducts, setCheckedProducts] = useState(
    Object.fromEntries((products || []).map(p => [p.id, true]))
  )
  const [quantities, setQuantities] = useState(
    Object.fromEntries((products || []).map(p => [p.id, p.quantity || 1]))
  )
  const [saving, setSaving] = useState(false)

  function toggleProduct(id) {
    setCheckedProducts(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function updateQuantity(id, delta) {
    setQuantities(prev => {
      const current = prev[id] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [id]: next }
    })
  }

  function calcTotal() {
    const servicesTotal = (services || []).reduce((sum, s) => sum + Number(s.price || 0), 0)
    const productsTotal = (products || []).reduce((sum, p) => {
      if (!checkedProducts[p.id]) return sum
      return sum + Number(p.price || 0) * (quantities[p.id] || 1)
    }, 0)
    return servicesTotal + productsTotal
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      const completedProducts = (products || [])
        .filter(p => checkedProducts[p.id])
        .map(p => ({ id: p.id, quantity: quantities[p.id] || 1 }))

      await onConfirm({ products: completedProducts })
    } finally {
      setSaving(false)
    }
  }

  const total = calcTotal()
  const hasProducts = products && products.length > 0
  const hasServices = services && services.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Completar reserva</h2>
          <p className="mt-1 text-sm text-gray-500">
            Verificá qué servicios y productos se realizaron realmente
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
          {/* Services */}
          {hasServices && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Servicios</h3>
              <div className="space-y-2">
                {services.map(s => (
                  <label key={s.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
                    />
                    <span className="flex-1 text-sm text-gray-700">{s.service?.name || s.name || 'Servicio'}</span>
                    <span className="text-sm font-medium text-gray-900">{fmtCurrency(s.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {hasProducts && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Productos</h3>
              <div className="space-y-2">
                {products.map(p => (
                  <div
                    key={p.id}
                    className={`rounded-lg border px-4 py-3 transition-colors ${
                      checkedProducts[p.id]
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checkedProducts[p.id] || false}
                        onChange={() => toggleProduct(p.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
                      />
                      <span className="flex-1 text-sm text-gray-700">{p.product?.name || p.name || 'Producto'}</span>
                      <span className="text-sm font-medium text-gray-900">{fmtCurrency(p.price)}</span>
                    </div>

                    {checkedProducts[p.id] && (
                      <div className="mt-2 ml-7 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Cant:</span>
                        <button
                          onClick={() => updateQuantity(p.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                        >
                          <MinusIcon />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-gray-800">
                          {quantities[p.id] || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(p.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                        >
                          <PlusIcon />
                        </button>
                        <span className="ml-2 text-xs text-gray-400">
                          = {fmtCurrency((p.price || 0) * (quantities[p.id] || 1))}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasServices && !hasProducts && (
            <p className="py-8 text-center text-sm text-gray-400">Esta reserva no tiene servicios ni productos.</p>
          )}

          {/* Total */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm font-medium text-gray-500">Total final</span>
            <span className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {fmtCurrency(total)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            loading={saving}
            disabled={!hasServices && !hasProducts}
          >
            Confirmar Completada
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CompleteAppointmentModal.jsx
git commit -m "feat: create CompleteAppointmentModal component"
```

---

### Task 3: Update BarberDashboard — add products fetch + modal

**Files:**
- Modify: `src/pages/barber/BarberDashboard.jsx`

- [ ] **Step 1: Add import for CompleteAppointmentModal and useState for modal**

Replace the existing imports section:

```jsx
import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import CompleteAppointmentModal from '../../components/CompleteAppointmentModal'
```

- [ ] **Step 2: Add modal state variables**

After the existing state declarations (after `const [transferringId, setTransferringId] = useState(null)`), add:

```jsx
const [completingApp, setCompletingApp] = useState(null) // appointment being completed
```

- [ ] **Step 3: Update the appointments query to include products**

In `fetchAll()`, change the query that gets `myApps` to include products. Find the `myRes` query and modify the `.select()`:

```jsx
supabase
  .from('appointments')
  .select('*, services:appointment_services(service:services(name, price)), products:appointment_products(product:inventory_products(name, price, current_stock))')
  .eq('barber_id', bid)
  .eq('business_id', businessId)
  .gte('date', date)
  .lte('date', date)
  .order('start_time'),
```

Do the same for `unassignedRes` and `otherBarbersRes` select queries.

- [ ] **Step 4: Add handleCompleteOpen function**

After `handleTransferAppointment`, add:

```jsx
async function handleCompleteOpen(appointment) {
  setCompletingApp(appointment)
}

async function handleCompleteConfirm(appointmentId, completedItems) {
  try {
    const { data, error } = await supabase.rpc('complete_appointment', {
      p_appointment_id: appointmentId,
      p_completed_products: completedItems.products || [],
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Error al completar')

    setCompletingApp(null)
    await fetchAll()
  } catch (err) {
    setError(err?.message || 'Error al completar la reserva')
  }
}
```

- [ ] **Step 5: Replace the "Completar" button onClick**

In the `renderAppointmentRow` function, find the "Completar" button and change its onClick:

```jsx
{a.status === 'in_progress' && (
  <button
    onClick={() => handleCompleteOpen(a)}
    className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
    title="Completar"
  >
    Completar
  </button>
)}
```

- [ ] **Step 6: Add the modal at the bottom of the return**

Before the closing `</div>` of the main return, add:

```jsx
{completingApp && (
  <CompleteAppointmentModal
    appointment={completingApp}
    services={completingApp.services || []}
    products={completingApp.products || []}
    onConfirm={(items) => handleCompleteConfirm(completingApp.id, items)}
    onClose={() => setCompletingApp(null)}
  />
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/barber/BarberDashboard.jsx
git commit -m "feat: add completion modal to barber dashboard"
```

---

### Task 4: Update Admin AppointmentsPage — add products fetch + modal

**Files:**
- Modify: `src/pages/admin/AppointmentsPage.jsx`

- [ ] **Step 1: Add import for CompleteAppointmentModal**

```jsx
import CompleteAppointmentModal from '../../components/CompleteAppointmentModal'
```

- [ ] **Step 2: Add modal state**

After `const [actionLoading, setActionLoading] = useState(false)`, add:

```jsx
const [completingApp, setCompletingApp] = useState(null)
```

- [ ] **Step 3: Update query to include products**

In `fetchAppointments()`, add products to the select:

```jsx
let query = supabase
  .from('appointments')
  .select(
    `
    id, date, start_time, status, total, notes, created_at,
    client:client_id (id, name, phone),
    barber:barber_id (id, name),
    services:appointment_services ( service:services ( name, price ) ),
    products:appointment_products ( id, quantity, price, product:inventory_products ( name, price, current_stock ) )
  `
  )
  .eq('business_id', businessId)
```

- [ ] **Step 4: Add handleCompleteOpen function**

After `handleStatusChange`, add:

```jsx
async function handleCompleteOpen(appointment) {
  setCompletingApp(appointment)
}

async function handleCompleteConfirm(appointmentId, completedItems) {
  setActionLoading(true)
  try {
    const { data, error } = await supabase.rpc('complete_appointment', {
      p_appointment_id: appointmentId,
      p_completed_products: completedItems.products || [],
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Error al completar')

    setCompletingApp(null)
    await fetchAppointments()
  } catch (err) {
    setError(err?.message || 'Error al completar la reserva')
  } finally {
    setActionLoading(false)
  }
}
```

- [ ] **Step 5: Find the COMPLETED action button and replace it**

In the `getActions` or wherever the action buttons are rendered, find where `APPOINTMENT_STATUS.COMPLETED` is used and replace the direct `handleStatusChange` call:

Change from:
```jsx
{status === APPOINTMENT_STATUS.IN_PROGRESS && showActions.includes(APPOINTMENT_STATUS.COMPLETED) && (
  <button onClick={() => handleStatusChange(appt, APPOINTMENT_STATUS.COMPLETED)} ...>
    Completada
  </button>
)}
```

To:
```jsx
{status === APPOINTMENT_STATUS.IN_PROGRESS && showActions.includes(APPOINTMENT_STATUS.COMPLETED) && (
  <button onClick={() => handleCompleteOpen(appt)} ...>
    Completada
  </button>
)}
```

- [ ] **Step 6: Add the modal at the bottom**

Before the closing `</div>` of the main return, add:

```jsx
{completingApp && (
  <CompleteAppointmentModal
    appointment={completingApp}
    services={completingApp.services || []}
    products={completingApp.products || []}
    onConfirm={(items) => handleCompleteConfirm(completingApp.id, items)}
    onClose={() => setCompletingApp(null)}
  />
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AppointmentsPage.jsx
git commit -m "feat: add completion modal to admin appointments page"
```

---

### Task 5: Build & verify

- [ ] **Step 1: Run build**

```bash
npm run build
```

- [ ] **Step 2: Fix any build errors**

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "chore: fix build issues after completion modal"
```
