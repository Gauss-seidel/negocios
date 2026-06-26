# Completar Reserva — Modal de verificación con productos y servicios

## Resumen

Cuando un barbero o admin cambia el estado de una reserva a "Completada", en lugar de hacerlo directamente, se abre un modal donde puede verificar qué servicios y productos realmente se realizaron. Al confirmar, se descuenta stock, se ajusta el precio total y se guarda el historial.

## Flujo actual

```
[En curso] → click "Completar" → update status = 'completed'
```

## Flujo nuevo

```
[En curso] → click "Completar" → MODAL con checkboxes de items
  → Admin/barbero destilda lo que no se hizo
  → Confirma
  → Se llama a complete_appointment(p_appointment_id, completed_items)
     → status = 'completed'
     → DELETE appointment_products no completados
     → UPDATE appointments.total = suma de items completados
     → UPDATE inventory_products.current_stock -= quantity (solo productos completados)
```

## Componentes

### 1. CompleteAppointmentModal (componente compartido)

Modal reutilizable entre BarberDashboard y Admin AppointmentsPage.

**Props:**
- `appointment` — objeto con datos de la reserva
- `services` — lista de servicios (con precio)
- `products` — lista de productos (con precio, cantidad, stock)
- `onConfirm(completedItems)` — callback con los items seleccionados
- `onClose` — cerrar modal
- `isOpen` — bool

**Estado interno:**
- `checkedItems: { [id]: bool }` — qué items están marcados como completados
- `productQuantities: { [id]: number }` — cantidades reales (no pueden exceder la reservada)

**UI:**
- Lista de servicios con checkbox (pre-marcados, deshabilitados porque un servicio reservado siempre se hace)
- Lista de productos con checkbox y quantity +/- (pre-marcados, editables)
- Total autocalculado: suma de servicios + suma de (productos checkeados × cantidad)
- Botón "Confirmar Completada" y "Cancelar"

### 2. complete_appointment(p_appointment_id, completed_items) — función SQL

**Input:**
```json
{
  "services": ["uuid1", "uuid2"],        // IDs de appointment_services completados
  "products": [                           // productos realmente llevados
    {"id": "uuid1", "quantity": 2},
    {"id": "uuid2", "quantity": 1}
  ]
}
```

**Lógica:**
1. Actualizar `appointments.status = 'completed'`
2. Para productos NO incluidos en `completed_items.products`:
   - DELETE FROM appointment_products WHERE id NOT IN (completed ids)
3. Para productos incluidos:
   - UPDATE appointment_products SET quantity = completed.quantity WHERE id = completed.id
   - UPDATE inventory_products SET current_stock = current_stock - (completed.quantity - old_quantity)
   - Si un producto no estaba en la reserva original, no insertar (solo se puede desmarcar)
4. Recalcular total:
   - Suma de appointment_services.price (todos, porque los servicios siempre se completan si se llegó a completar)
   - + Suma de appointment_products.price * quantity (solo los que quedan)
   - UPDATE appointments.total = nuevo total

## Cambios necesarios

### DB
1. Nueva migración: `20260625200002_complete_appointment_function.sql`
   - Crear función `complete_appointment`
   - (Opcional) Trigger para logging

### Frontend — CompleteAppointmentModal
- Nuevo componente: `src/components/CompleteAppointmentModal.jsx`
- Checkbox list para servicios (solo lectura, siempre completados)
- Checkbox + quantity controls para productos
- Total autocalculado en tiempo real

### Frontend — BarberDashboard.jsx
- Modificar `handleStatusChange` cuando `newStatus === 'completed'`
- En lugar de update directo, abrir modal
- Agregar `products:appointment_products(product:inventory_products(name, price, current_stock))` al SELECT de appointments
- Pasar datos al modal

### Frontend — Admin AppointmentsPage.jsx
- Modificar botón "Completada" para abrir modal
- Agregar `products:appointment_products(product:inventory_products(name, price, current_stock))` al SELECT
- Pasar datos al modal

### Frontend — Formato
- Usar `formatCurrency` (₲) existente en utils/format

## Flujo detallado

```
Reserva con: Corte (₲30.000) + Barba (₲20.000) + Cera (₲15.000, qty 1)

Modal muestra:
  ☑ Corte - ₲30.000 (deshabilitado, servicio obligatorio)
  ☑ Barba - ₲20.000 (deshabilitado, servicio obligatorio)
  ☑ Cera - ₲15.000 [qty: 1] (+/−)

Barbero destilda "Cera" porque el cliente no la llevó:
  Total: ₲50.000 (solo servicios)

Confirma → se llama complete_appointment:
  - status = completed
  - DELETE appointment_products de la cera
  - NO descuenta stock de cera
  - appointments.total = 50000
```

## Edge cases

- **Reserva sin productos**: el modal solo muestra servicios (todos pre-checkeados)
- **Reserva sin servicios**: no debería pasar, pero si ocurre, solo muestra productos
- **Producto sin stock suficiente**: el modal lo muestra igual (el stock real se descuenta al confirmar)
- **Error en la función**: mostrar toast con error, no cambiar estado
- **Barbero cierra modal sin confirmar**: no pasa nada, la reserva sigue "En curso"

## Testing

- Probar completar reserva con y sin productos
- Probar destildar un producto → no descuenta stock, baja el total
- Probar cambiar cantidad de un producto → descuenta la diferencia
- Verificar que el total en appointments se actualiza
- Verificar que barberos y admins pueden usar el modal
