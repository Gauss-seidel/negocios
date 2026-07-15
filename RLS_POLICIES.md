# RLS Policies — BarberShifts

> Mapa de todas las policies de Row Level Security organizadas por tabla.
> Las policies se combinan con OR (permissive). Si alguna permite la operación, pasa.

## Patrones usados

| Pattern | Descripción |
|---------|-------------|
| `is_super_admin()` | Usuario tiene `app_metadata.role = 'super_admin'` |
| `current_user_role()` | Extrae `app_metadata.role` del JWT |
| `current_user_business_id()` | Extrae `app_metadata.business_id` del JWT |
| `auth.uid()` | ID del usuario autenticado |
| `auth.email()` | Email del usuario autenticado |

## Leyenda

- `ALL` = cubre SELECT, INSERT, UPDATE, DELETE
- `{public}` = todos los roles incluyendo anon
- `{authenticated}` = solo usuarios logueados
- `{anon}` = solo usuarios no autenticados

---

## `appointments` (8 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_insert_appointments` | INSERT | anon | Anónimos pueden crear reservas |
| `public_insert` | INSERT | public | Clientes autenticados pueden crear reservas si el negocio está activo |
| `public_read` | SELECT | public | Leer reservas de negocios activos |
| `barber_own` | ALL | public | Barberos pueden ver/modificar reservas de su negocio |
| `business_admin_own` | ALL | public | Business admins pueden todo en su negocio |
| `staff_select_appointments` | SELECT | authenticated | Staff puede leer reservas de su negocio |
| `staff_update_appointments` | UPDATE | authenticated | Staff puede actualizar reservas de su negocio |
| `super_admin_all` | ALL | public | Super admins pueden todo (vía `is_super_admin()`) |

---

## `branches` (7 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_select_active_branches` | SELECT | anon | Anónimos ver sucursales activas |
| `public_select_active_branches` | SELECT | anon,authenticated | Todos ver sucursales activas |
| `business_staff_select_branches` | SELECT | authenticated | Staff ver sucursales de su negocio |
| `business_admin_insert_branches` | INSERT | authenticated | Business admin crear (si tiene staff record) |
| `business_admin_update_branches` | UPDATE | authenticated | Business admin actualizar |
| `business_admin_delete_branches` | DELETE | authenticated | Business admin eliminar |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `business_staff` (3 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `staff_manage_own` | ALL | public | Business admin gestiona staff de su negocio |
| `staff_read_own` | SELECT | public | Usuario lee su propio staff record |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `businesses` (4 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `public_read_active` | SELECT | public | Leer negocios activos |
| `barber_read_own` | SELECT | public | Barberos leer su negocio |
| `business_admin_own` | ALL | public | Business admin gestiona su negocio |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `clients` (8 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_insert_clients` | INSERT | anon | Anónimos crear cliente (booking) |
| `public_insert` | INSERT | public | Crear cliente si negocio activo |
| `public_read` | SELECT | public | Leer clientes de negocios activos |
| `staff_insert_clients` | INSERT | authenticated | Staff crear clientes |
| `staff_select_clients` | SELECT | authenticated | Staff leer clientes de su negocio |
| `barber_read` | SELECT | public | Barberos leer clientes de su negocio |
| `business_admin_own` | ALL | public | Business admin gestiona clientes |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `services` (9 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_select_active_services` | SELECT | anon | Anónimos ver servicios activos |
| `public_read` | SELECT | public | Leer servicios de negocios activos |
| `staff_select_services` | SELECT | authenticated | Staff leer servicios de su negocio |
| `staff_insert_services` | INSERT | authenticated | Staff crear servicios |
| `staff_update_services` | UPDATE | authenticated | Staff actualizar servicios |
| `staff_delete_services` | DELETE | authenticated | Staff eliminar servicios |
| `barber_read` | SELECT | public | Barberos leer servicios de su negocio |
| `business_admin_own` | ALL | public | Business admin gestiona servicios |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `inventory_products` (9 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_select_active_inventory` | SELECT | anon | Anónimos ver productos activos |
| `public_read` | SELECT | public | Leer productos de negocios activos |
| `staff_select_inventory` | SELECT | authenticated | Staff leer productos de su negocio |
| `staff_insert_inventory` | INSERT | authenticated | Staff crear productos |
| `staff_update_inventory` | UPDATE | authenticated | Staff actualizar productos |
| `staff_delete_inventory` | DELETE | authenticated | Staff eliminar productos |
| `barber_read` | SELECT | public | Barberos leer productos de su negocio |
| `business_admin_own` | ALL | public | Business admin gestiona productos |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `business_hours` (5 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `anon_select_business_hours` | SELECT | anon | Anónimos ver horarios |
| `public_read` | SELECT | public | Leer horarios de negocios activos |
| `barber_read` | SELECT | public | Barberos ver horarios de su negocio |
| `business_admin_own` | ALL | public | Business admin gestiona horarios |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `barbers` (4 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `public_read` | SELECT | public | Leer barberos de negocios activos |
| `barber_read` | SELECT | public | Barberos leer su propio negocio |
| `business_admin_own` | ALL | public | Business admin gestiona barberos |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `cash_register` (5 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `staff_select_cash_register` | SELECT | authenticated | Staff leer caja de su negocio |
| `staff_insert_cash_register` | INSERT | authenticated | Staff abrir caja |
| `staff_update_cash_register` | UPDATE | authenticated | Staff cerrar/actualizar caja |
| `business_admin_own` | ALL | public | Business admin gestiona cajas |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `cash_movements` (4 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `staff_select_cash_movements` | SELECT | authenticated | Staff leer movimientos |
| `staff_insert_cash_movements` | INSERT | authenticated | Staff crear movimientos |
| `business_admin_own` | ALL | public | Business admin gestiona movimientos |
| `super_admin_all` | ALL | public | Super admins pueden todo |

---

## `audit_logs` (2 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `audit_select_own` | SELECT | authenticated | Leer logs propios |
| `audit_insert` | INSERT | authenticated | Crear logs |

---

## `appointment_products` (6 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `public_read` | SELECT | public | Leer productos de reservas públicas |
| `public_insert` | INSERT | public | Insertar productos en reservas |
| `client_insert_appointment_products` | INSERT | public | Cliente inserta productos (vía email) |
| `barber_read_appointment_products` | SELECT | public | Barbero lee productos |
| `business_admin_all_appointment_products` | ALL | public | Business admin gestiona |
| `super_admin_all_appointment_products` | ALL | public | Super admin todo |

---

## `appointment_services` (3 policies)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `public_insert` | INSERT | public | Insertar servicios en reservas |
| `business_admin_own` | ALL | public | Business admin gestiona |
| `super_admin_all` | ALL | public | Super admin todo |

---

## `super_admins` (1 policy)

| Policy | Cmd | Roles | ¿Qué permite? |
|--------|-----|-------|---------------|
| `super_admin_select_self` | SELECT | public | Leer la tabla (necesario para `is_super_admin()`) |

---

## Reglas de oro

1. **Toda tabla debe tener `super_admin_all`** — si no, el super_admin no puede operarla (error #10)
2. **`business_admin_own`** usa `current_user_role()` + `current_user_business_id()` — funciona porque el JWT tiene esos claims
3. **`staff_*` policies** usan `auth.uid()` con join a `business_staff` — funcionan para cualquier usuario con un staff record
4. **`public_read`** filtra por `businesses.status = 'active'` — negocios suspendidos son invisibles
5. **`anon_*`** policies son para el booking flow público
