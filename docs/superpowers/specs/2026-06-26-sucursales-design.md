# Sucursales (Branches) — Diseño

**Fecha:** 2026-06-26
**Estado:** Pendiente de revisión

## Objetivo

Implementar el concepto de sucursales en BarberShifts. Un negocio puede tener múltiples sucursales según su plan. Servicios y clientes son compartidos entre sucursales. Barbers, appointments, cash, inventory y hours son por sucursal.

---

## Modelo de datos

### Nueva tabla: `branches`

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  google_maps_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);
```

### Columnas nuevas en tablas existentes

| Tabla | Columna | Restricción |
|-------|---------|-------------|
| `barbers` | `branch_id` UUID → branches | NOT NULL post-migracion |
| `appointments` | `branch_id` UUID → branches | NOT NULL post-migracion |
| `cash_movements` | `branch_id` UUID → branches | NOT NULL post-migracion |
| `inventory_items` | `branch_id` UUID → branches | NOT NULL post-migracion |
| `business_hours` | `branch_id` UUID → branches | NOT NULL post-migracion |

### Se mantienen business-wide

- `services`, `service_categories` — mismos servicios en todas las sucursales
- `clients` — un cliente puede visitar cualquier sucursal

### Migración de datos existentes

- Cada negocio existente obtiene una sucursal "Principal" con los datos actuales (name, address, phone). El slug se genera automáticamente como `principal`.
- Todos los registros existentes en tablas que ahora tienen `branch_id` se backfillean con el ID de esa sucursal.
- Una vez backfilleado, se aplica NOT NULL a las columnas `branch_id`.
- La migración se ejecuta como SQL directo en Supabase Dashboard > SQL Editor.

**Nota:** `business_hours` usa delete-and-reinsert, la migración de hours existentes debe ser manual (re-crear los horarios asignando la sucursal) o mediante un script SQL que copie los registros con el branch_id correspondiente.

---

## Super Admin

### Crear barbería — campos extendidos

El form de creación de negocio en `SuperDashboard` se extiende con:

```
Sección: "Sucursal inicial"
├── Nombre de sucursal  (default: "Principal")
├── Dirección           (default: toma la dirección del negocio)
└── Teléfono            (default: toma el teléfono del negocio)
```

Flujo: `INSERT businesses` + `INSERT branches` en una transacción (usando la edge function `admin-super` o directamente con `Promise.all` y verificando consistencia).

### Gestión de sucursales desde super admin

En la tabla de barberías, cada fila tiene acción **"Ver sucursales"** que muestra:

- Lista de sucursales de esa barbería
- Botón "Agregar sucursal" — valida contra `max_branches` del plan
- Editar nombre, dirección, teléfono
- Activar/Desactivar sucursal

---

## Business Admin

### Selector de sucursal en el layout

En `AdminLayout`, se agrega un `<BranchSelector />` en el sidebar o sobre el contenido:

```
┌──────────────────────────────┐
│ BarberShifts                 │
├──────────────────────────────┤
│ [Sucursal Centro ▼]  2/3    │
├──────────────────────────────┤
│ Dashboard                    │
│ Reservas                     │
│ ...                          │
```

El selector cambia el contexto global (`BranchContext`) que las páginas consumen.

### BranchContext

Nuevo contexto en `src/contexts/BranchContext.jsx`:

```jsx
{
  currentBranch: { id, name, slug },
  branches: [{ id, name, slug, address }],
  branchCount: 2,
  planLimit: 3,
  switchBranch(branchId),
  loading,
}
```

**Persistencia:** La sucursal seleccionada se guarda en `localStorage` para que persista entre sesiones. Si la sucursal guardada ya no existe o fue desactivada, se selecciona la primera activa.

Se usa en todas las páginas para filtrar queries.

### Nueva página: Sucursales

Ruta: `/admin/mi-negocio/sucursales`

- Lista de sucursales con nombre, dirección, teléfono, estado
- Botón "Agregar sucursal" — deshabilitado si `branchCount >= planLimit`
- Editar sucursal (modal o inline): nombre, dirección, teléfono, Google Maps URL
- **Slug** se auto-genera desde el nombre (misma lógica que `genSlug` en SuperDashboard)
- Activar/Desactivar
- Al llegar al límite: "Actualizá tu plan para agregar más sucursales" con link a Planes

### Modificaciones en páginas existentes

| Página | Cambio |
|--------|--------|
| **Dashboard** | Métricas filtradas por `currentBranch.id` |
| **Barberos** | Filtrar por branch. Al crear/editar, asignar branch. |
| **Reservas** | Filtrar por branch. |
| **Caja** | Filtrar por branch. |
| **Inventario** | Filtrar por branch. |
| **Horarios** | Filtrar por branch. |
| **Servicios** | Sin cambios (compartidos). |
| **Clientes** | Sin cambios (compartidos). |
| **Planes** | Sin cambios. |

---

## Páginas Públicas

### `/barberia/:slug` — Listado de sucursales

En vez de una sola dirección, muestra todas las sucursales activas como tarjetas:

```
Barbería El Clásico
━━━━━━━━━━━━━━━━━━━

Nuestras sucursales:
┌─────────────────────────────────────┐
│  Sucursal Centro                    │
│  Avda. Principal 1234              │
│  📞 (021) 555-1234                  │
│  [Reservar en esta sucursal]        │
├─────────────────────────────────────┤
│  Sucursal Norte                     │
│  Avda. Mariscal López 5678         │
│  📞 (021) 555-5678                  │
│  [Reservar en esta sucursal]        │
└─────────────────────────────────────┘
```

### `/barberia/:slug/reservar` — Booking con sucursal

- Si el negocio tiene 1 sucursal → comportamiento actual (sin cambios)
- Si tiene varias → selector al inicio "Elegí tu sucursal" con las opciones disponibles
- Soporta `?branch=sucursal-centro` para enlace directo desde la página anterior

---

## Plan de implementación (orden sugerido)

1. SQL migration: crear tabla `branches`, agregar columnas, migrar datos existentes
2. `BranchContext.jsx` — contexto global para la sucursal activa
3. Modificar `AdminLayout.jsx` — agregar `BranchSelector`
4. Modificar `SuperDashboard.jsx` — agregar campos de sucursal al crear negocio
5. Página `SuperBranchesPage.jsx` — gestión de sucursales desde super admin
6. Página `SucursalesPage.jsx` — gestión de sucursales desde admin del negocio
7. Modificar páginas admin: Dashboard, Barbers, Appointments, Cash, Inventory, Hours
8. Modificar páginas públicas: `BarberiaPage.jsx`, `BookingPage.jsx`
9. Tests
