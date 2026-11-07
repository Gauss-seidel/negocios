# Architecture — BarberShifts

## Stack

```
Frontend (React + Vite) ─── Supabase (DB + Auth + Edge Functions)
         │
    Render (Static Site)
```

### Frontend
- **React 18** (JavaScript, no TypeScript)
- **Vite** como bundler
- **React Router v6** para routing
- **Supabase JS client** (`@supabase/supabase-js`)
- Sin backend propio, sin SSR, sin Node en runtime

### Backend
- **Supabase PostgreSQL** como base de datos
- **Supabase Auth** para autenticación (email/password)
- **Supabase Edge Functions** (Deno/TypeScript) para operaciones admin que requieren service_role key
- **RLS (Row Level Security)** para control de acceso a datos
- **No hay servidor propio** — cero servidores que mantener

## Decisiones clave

### Por qué sin backend propio
- Evitar costos y mantenimiento de servidores
- Supabase cubre auth, DB, y Edge Functions
- El frontend se hostea como Static Site en Render (gratuito)
- RLS reemplaza la capa de autorización que haría un backend

### Por qué RLS en vez de API layer
- Menos código que mantener
- La seguridad está en la DB, no en una capa intermedia
- Permite que el frontend hable directo a Supabase
- **Contra**: requiere entender bien RLS o se rompe todo (error #6, #10)

### Por qué JavaScript y no TypeScript
- Decisión del proyecto original
- Edge Functions usan TypeScript (son Deno, lo exige)
- El frontend es JS puro

## Routing

```
/                               → Marketplace (público)
/barberia/:slug                 → BarberiaPage (público)
/barberia/:slug/reservar        → BookingPage (público)
/barberia/:slug/tv              → TVQueue (público, sin auth)
/admin                          → Login
/admin/dashboard                → SuperDashboard (super_admin)
/admin/mi-negocio               → BusinessDashboard (business_admin)
/admin/mi-trabajo               → BarberDashboard (barber)
/admin/*                        → Varias páginas admin CRUD
```

Las rutas admin están envueltas en `<ProtectedRoute>` que verifica `userRole`.

## Seguridad

- **Auth**: Supabase Auth con JWT
- **RLS**: Policies por tabla (ver RLS_POLICIES.md)
- **CSP**: Content-Security-Policy en index.html
- **Edge Function `admin-super`**: Validación de sesión + service_role key para crear/actualizar usuarios

## Templates

Cada barbería tiene un `template_id` que define colores, fuentes y layout de la página pública. Se resuelve con `getTemplateConfig()` del registry de templates.
