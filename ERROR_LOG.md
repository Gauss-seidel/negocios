# Error Log — BarberShifts

> Registro cronológico de errores encontrados durante el desarrollo.
> **Antes de cualquier cambio, revisá este archivo para no reintroducir errores pasados.**

---

## 📋 Regla de oro

**Todo cambio debe verificar que no reintroduce un error anterior o similar.**
Usar este archivo como checklist antes de modificar:
- Edge Functions → revisar errores #3, #6, #9
- Consultas Supabase (joins) → revisar errores #2, #4, #5
- CSP / Seguridad → revisar error #7
- Migraciones SQL → revisar errores #1, #8
- Lazy loading / React → revisar error #10
- Formularios / submit → revisar error #9

---

## 2026-07-03

### #9 — Edge Function: `efData.data.user_id` es undefined al crear barbería

**Síntoma:** Al crear una nueva barbería desde SuperDashboard, muestra "Error al asignar admin: Missing required fields: user_id, app_metadata".

**Causa:** La Edge Function `admin-super` en `create_user` devuelve `{ success: true, data: { user: { id, email, ... } } }`. El frontend en `SuperDashboard.jsx` leía `efData.data.user_id` (undefined) en vez de `efData.data.user.id`.

**Fix:** Cambiar `efData.data.user_id` → `efData.data.user.id` (línea 196).

**Pattern: Al leer respuestas de Edge Functions, verificar que el campo existe en la estructura real que devuelve el servidor.**

---

### #8 — CAPTCHA de Supabase bloquea login

**Síntoma:** Login devuelve 400 con `captcha_failed: no captcha_token found`.

**Causa:** CAPTCHA protection estaba habilitado en Supabase Dashboard > Authentication > Settings, pero el frontend no enviaba captcha token.

**Fix:** Desactivar CAPTCHA en Supabase Dashboard + eliminar todo el código de reCAPTCHA del frontend.

**Lección: Los cambios de seguridad en Supabase Dashboard (CAPTCHA, rate limits, email confirmation) afectan el login inmediatamente. Verificar estas configuraciones cuando el login deje de funcionar.**

---

### #7 — CSP bloquea recursos (Google Fonts, reCAPTCHA, etc.)

**Síntoma:** Google Fonts no cargan, reCAPTCHA no se ejecuta, posibles errores de conexión.

**Causa:** `Content-Security-Policy` en `index.html` con `script-src 'self'` bloquea scripts externos (reCAPTCHA, Google Fonts CSS).

**Fix:** Agregar dominios a la CSP: `fonts.googleapis.com`, `fonts.gstatic.com`, `https://www.google.com` al script-src si se usa reCAPTCHA.

**CSP actual:**
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; manifest-src 'self';
```

**Lección: Siempre probar login y carga de página después de tocar CSP.**

---

## 2026-07-02

### #6 — Security Phase 2: RLS masivo puede romper consultas

**Síntoma:** Después de aplicar migración de seguridad con RLS en 17 tablas, consultas que antes funcionaban empiezan a fallar con "permission denied" o rows vacíos.

**Causa:** Se habilitó RLS en tablas que antes no tenían, y las policies no cubren todos los casos de uso (ej: anon insert en clients, staff CRUD, etc.).

**Fix:** Asegurar que cada tabla tenga policies para SELECT, INSERT, UPDATE, DELETE según corresponda. Especial atención a:
- `appointments`: anon insert, staff select/update
- `clients`: staff CRUD, anon insert
- `inventory_products`: anon select active, staff CRUD
- `branches`: anon select active

**Lección: Al migrar RLS, verificar cada operación del sistema (login, booking, admin, barber). Usar `supabase db query --linked` para ver policies activas.**

---

## 2026-06-25

### #5 — `client_name` no existe como columna, usar join

**Síntoma:** `appointments.client_name` devuelve undefined/empty. El nombre del cliente no aparece en TV Queue ni InvoiceModal.

**Causa:** La tabla `appointments` no tiene columna `client_name`. El nombre está en `clients.name` y se accede vía FK `appointments.client_id → clients.id`. La consulta usaba `client_name` como si fuera una columna directa.

**Fix:** Usar `client:client_id(name, phone)` en las consultas Supabase en vez de `client_name`.

**Pattern correcto:**
```js
// ✅ Correcto
.select('..., client:client_id(name, phone)')

// ❌ Incorrecto
.select('..., client_name')
```

**Lección: Revisar el esquema de la DB antes de escribir queries. Las columnas no siempre se llaman como uno espera.**

---

## 2026-06-20

### #4 — Edge Function `admin-super` validación de tipo

**Síntoma:** La Edge Function rechaza requests de `business_admin` porque la validación de tipos no coincide con lo que envía el frontend.

**Causa:** TypeScript type narrowing en Edge Function no coincidía con los campos enviados.

**Fix:** Sincronizar tipos entre frontend y Edge Function. La interfaz `CreateUserPayload` espera `email, password, role` y opcionalmente `business_id`.

**Lección: Edge Functions tienen tipos estrictos. Si el frontend envía un campo que la función no espera (o viceversa), falla silenciosamente.**

---

## 2026-06-15 — Semana 1

### #3 — RLS en `super_admins` sin policies

**Síntoma:** Cualquier policy que hace `EXISTS (SELECT 1 FROM super_admins WHERE id = auth.uid())` retorna falso siempre.

**Causa:** `super_admins` tenía RLS habilitado pero cero policies. Cero rows visibles.

**Fix:** Agregar policy `super_admin_select_self` con `FOR SELECT USING (true)` o directamente deshabilitar RLS en esa tabla.

---

### #2 — `recalc_appointment_total` no incluye productos

**Síntoma:** El total de una reserva con productos se calcula mal (solo suma servicios).

**Causa:** El trigger `trg_recalc_total` solo escuchaba cambios en `appointment_services`. `appointment_products` no tenía triggers.

**Fix:** Agregar triggers `trg_recalc_total_product_insert` y `trg_recalc_total_product_delete` en `appointment_products`.

---

### #1 — Stock negativo en `complete_appointment`

**Síntoma:** El stock de productos podía quedar negativo al completar una reserva.

**Causa:** La RPC `complete_appointment` descontaba stock sin verificar `current_stock >= quantity`.

**Fix:** Agregar validación de stock antes de descontar. Si stock insuficiente, retornar error.

---

## 🔍 Checklist pre-commit

Antes de committear cualquier cambio, verificar:

- [ ] `npm run build` → 0 errores
- [ ] Login funciona (admin, super_admin, barber)
- [ ] Consultas Supabase usan joins correctos (`client:client_id(name)`, no `client_name`)
- [ ] Edge Functions: campos en la respuesta coinciden con los que lee el frontend
- [ ] CSP: si se modifica, probar login + fonts + scripts externos
- [ ] RLS: si se agrega, probar todas las operaciones (anon, staff, admin)
- [ ] No hay `efData.data.user_id` (usar `efData.data.user.id`)
- [ ] No hay referencias a columnas que no existen en la DB
- [ ] Los mensajes de error en el frontend muestran información útil para debugging

---

## 📦 Referencias útiles

| Recurso | Ruta |
|---------|------|
| Esquema DB | `supabase/migrations/` |
| Fixes previos DB | `20260703_fix_security_audit.sql`, `20260703_fix_security_phase2.sql` |
| Edge Function | `supabase/functions/admin-super/index.ts` |
| FIXES.md (auditoría anterior) | `FIXES.md` |
| Variables de entorno | `.env.example` |
