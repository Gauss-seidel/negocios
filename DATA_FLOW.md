# Data Flow — BarberShifts

> Flujos clave del sistema: qué componentes, RPCs, tablas y Edge Functions participan.

---

## 1. Booking (reserva desde la página pública)

```
Usuario → BarberiaPage → BookingPage
                             │
                    ┌────────┴────────┐
                    │   Wizard 7 pasos  │
                    │ 1. Servicio       │
                    │ 2. Barbero        │
                    │ 3. Fecha          │
                    │ 4. Horario        │
                    │ 5. Productos      │
                    │ 6. Datos cliente  │
                    │ 7. Confirmación   │
                    └────────┬────────┘
                             │ handleSubmit()
                             │
               ┌─────────────┼─────────────┐
               │             │             │
           Buscar o       INSERT en     INSERT en
         crear cliente  appointments  appointment_services
               │                             │
               │                     INSERT en (opcional)
               │                   appointment_products
               │
          clients table          appointments table
```

**Tablas involucradas:** `clients`, `appointments`, `appointment_services`, `appointment_products`

**RLS:** `anon_insert_appointments`, `public_insert`, `anon_insert_clients`, `public_insert` (clients)

**Anti-spam:** trigger `check_booking_spam` — max 3 reservas por teléfono en 2 horas

---

## 2. Completar turno (barbero/admin)

```
AppointmentsPage / BarberDashboard
         │
    CompleteAppointmentModal
         │
    handleConfirm()
         │
    supabase.rpc('complete_appointment', {
      p_appointment_id,
      p_completed_products
    })
         │
         ├── Valida que la reserva existe
         ├── Elimina appointment_products no incluidos
         ├── Actualiza cantidades de productos
         ├── Verifica stock suficiente (error si no)
         ├── Descuenta stock de inventory_products
         ├── Calcula total (servicios + productos)
         └── UPDATE appointments SET status='completed', total=...
              │
         Retorna { success, total }
              │
    InvoiceModal → Muestra ticket + botón imprimir + WhatsApp
```

**Tablas:** `appointments`, `appointment_services`, `appointment_products`, `inventory_products`

**RPC:** `complete_appointment()` (PL/pgSQL, SECURITY DEFINER, SET search_path = public)

**Trigger:** `auto_cash_on_completion` — si la caja está abierta, crea movimiento automático

---

## 3. Crear barbería (super_admin)

```
SuperDashboard → "Nueva Barbería"
         │
    handleCreateSubmit()
         │
    ┌────┴────┐
    │         │
    │  Paso 1: Edge Function admin-super (create_user)
    │   POST /functions/v1/admin-super
    │   { action: 'create_user', email, password, role: 'business_admin' }
    │   → Devuelve { success, data: { user: { id, email, ... } } }
    │
    │  Paso 2: INSERT INTO businesses
    │   (corre como super_admin, usa RLS super_admin_all)
    │
    │  Paso 3: Edge Function admin-super (update_user)
    │   { action: 'update_user', user_id, app_metadata: { role, business_id } }
    │
    │  Paso 4: INSERT INTO business_staff
    │   (corre como super_admin, usa RLS super_admin_all)
    │
    │  Paso 5: INSERT INTO branches
    │   (corre como super_admin, usa RLS super_admin_all)
    │
    └────┬────┘
         │
    showCreate=false, fetchAll()
```

**Edge Function:** `admin-super/index.ts` (Deno/TypeScript)
- Usa `service_role_key` para crear/actualizar usuarios en `auth.users`
- Valida que el caller tenga sesión y rol `super_admin` o `business_admin`

**Tablas:** `businesses`, `business_staff`, `branches`

**RLS crítico:** `branches` debe tener `super_admin_all` (error #10)

---

## 4. Login

```
Login.jsx
    │
    supabase.auth.signInWithPassword({ email, password })
    │
    Supabase Auth valida credenciales + genera JWT
    │
    AuthContext.jsx
    ├── setSession(session)
    ├── setUser(session.user)
    └── extractClaims(user.app_metadata)
         ├── userRole = role (super_admin | business_admin | barber)
         └── businessId = business_id
              │
    ProtectedRoute redirige según rol:
    ├── super_admin → /admin/dashboard
    ├── business_admin → /admin/mi-negocio
    └── barber → /admin/mi-trabajo
```

**JWT claims:**
```json
{
  "app_metadata": {
    "role": "super_admin",
    "business_id": "uuid"
  }
}
```

**Persistencia:** Supabase guarda sesión en localStorage, auto-refresh cada hora. Vive hasta logout o ~30 días sin actividad.

---

## 5. TV Queue (pantalla pública)

```
/barberia/:slug/tv
    │
    TVQueue.jsx
    │
    useEffect cada 30s → loadData()
    │
    SELECT appointments + client:client_id(name) + barber:barber_id(name)
    WHERE business_id, date=today, status IN (pending, confirmed, in_progress, completed)
    │
    Si hay branch selector → filtra por branch_id
    │
    Renderiza grupos:
    ├── En progreso
    ├── Próximos
    └── Completados
```

**Sin auth** — página pública para pantallas en la barbería.

---

## 6. Invoice + WhatsApp

```
complete_appointment RPC exitoso
    │
    CompleteAppointmentModal → setCompletedAppt({ ...appointment, services, products, total })
    │
    InvoiceModal
    ├── Muestra ticket (estilo recibo)
    ├── Botón Imprimir (window.print() + @media print)
    └── Botón WhatsApp → wa.me/{phone}?text={ticket_formateado}
```

El teléfono se normaliza: `0981 234 567` → `595981234567`
