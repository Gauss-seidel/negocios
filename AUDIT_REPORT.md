# Informe Final — Auditoría y Fortalecimiento Integral BarberShifts

> **SUPERSEDIDO.** Este documento fue reemplazado por **`AUDIT_REPORT_FINAL.md`**,
> que contiene la evidencia verificada contra producción, los hallazgos P0
> (reserva rota y fuga multi-tenant) y el orden obligatorio de aplicación de la
> migración `20260710`. Conservado solo como registro histórico.

Fecha: 2026-11-07

## A. Resumen ejecutivo

BarberShifts es una plataforma SaaS de reservas para barberías (React 19 + Vite + Supabase/PostgreSQL) con un conjunto amplio de funcionalidades ya implementadas (marketplace, booking público, admin, super admin, caja, inventario, reportes, PWA). Se realizaron correcciones de seguridad, estabilidad y calidad sin reconstruir el proyecto.

Estado: **Apto para pruebas controladas / piloto comercial** (no para producción masiva hasta verificar DB remota y RLS en vivo).

## B. Problemas encontrados (principales)

- Crítico: Edge Function `admin-super` permitía creación de `super_admin` por cualquier admin y `update_user` sin validar pertenencia/rol.
- Crítico: Service Worker cacheaba respuestas de Supabase (riesgo multi-tenant).
- Crítico: Reservas públicas con `anon_insert_*` permisivas (`WITH CHECK (true)`).
- Alto: Límites de planes con `maxMonthlyBookings` artificial (100/500) contradiciendo "reservas ilimitadas".
- Alto: "Sin preferencia" guardaba `barber_id = null` sin selección automática ni protección de concurrencia por barbero.
- Alto: ESLint con 40 errores (react-hooks, refs during render, etc.).
- Medio: `complete_appointment` SECURITY DEFINER (ya corregido en migración previa, reforzado).
- Medio: Migraciones no reconstruyen esquema inicial (dependencias remotas).
- Bajo: Imports no usados, estados duplicados, ref access during render.

## C. Archivos modificados

- `supabase/functions/admin-super/index.ts` — validación de identidad/rol, prevención de escalamiento, validación de negocio, sincronización `super_admins`.
- `public/sw.js` — no cachea Supabase; cache-first solo estáticos; offline fallback seguro.
- `src/lib/constants.js` — `maxMonthlyBookings: Infinity` en los 3 planes.
- `src/contexts/AuthContext.jsx`, `BranchContext.jsx` — correcciones de hooks/lint.
- `src/hooks/usePlan.js` — corrección de efecto.
- `src/pages/admin/*` (Appearance, BusinessDashboard, Cash, Clients, Inventory, Reports, SuperBarberos, SuperConfig, SuperDashboard) — correcciones de hooks/lint y limpieza.
- `src/pages/barber/BarberProfile.jsx` — corrección de memoización/efecto.
- `src/pages/barberia/BarberiaPage.jsx` — hooks reordenados.
- `src/pages/barberia/BookingPage.jsx` — selección automática de barbero, verificación de disponibilidad por barbero, limpieza de imports/estado.
- `src/pages/public/Marketplace.jsx`, `TVQueue.jsx` — correcciones de efectos/refs.
- `src/pages/admin/SuperConfigPage.jsx` — eliminada inserción manual en `super_admins` (ahora en edge function); envío de `name`.
- `supabase/migrations/20260704_security_hardening.sql` — nuevo.

## D. Migraciones SQL

Nueva migración: `20260704_security_hardening.sql`:
- Función `is_super_admin()`.
- RLS restringida en `super_admins` (SELECT/INSERT/UPDATE/DELETE).
- Endurecimiento de `anon_insert_appointments` y `anon_insert_clients` (solo negocios activos).
- Triggers `enforce_barber_limit` y `enforce_branch_limit` (validación de límites de plan en backend).
- Índices de performance.

Pendiente: esquema inicial completo no está en migraciones (solo incrementales). Requiere reconstrucción desde DB remota o Supabase CLI (`supabase db pull`).

## E. Pruebas

- ESLint: 0 errores, 23 warnings (aceptables).
- Build de producción: exitoso (Vite).
- No se pudieron ejecutar tests de DB (sin acceso a Supabase remoto ni credenciales).

## F. Seguridad

- Aislamiento multi-tenant: RLS existentes basadas en `business_staff`; endurecidas inserciones públicas.
- Protección de `super_admin`: edge function valida rol desde `app_metadata`; solo super_admin puede crear/actualizar/eliminar privilegiados.
- SECURITY DEFINER: `complete_appointment` y nuevas funciones con `search_path` seguro y validaciones.
- Reservas públicas: validación de negocio activo; precio/duración provienen de `selectedService` (frontend) — recomendable migrar a RPC atómica en siguiente fase.
- Datos privados: SW ya no cachea Supabase.

## G. Pendientes

- Acceso al proyecto Supabase remoto para aplicar/verificar migraciones y RLS.
- Reconstrucción del esquema inicial desde DB remota (migraciones incompletas).
- Implementar RPC atómica para reservas (transacción + constraint UNIQUE por barbero/horario) — actualmente se basa en constraint UNIQUE existente en DB.
- Validación de planes en frontend (`usePlan`) ya lee de DB; límites ahora también en backend via triggers.
- WhatsApp automático, personalización avanzada (funcionalidades de Premium) no implementadas.
- Tests automatizados (Vitest/Playwright) no existen; se recomienda añadir.

## H. Estado final

**Apto para pruebas controladas / piloto comercial**, con las siguientes condiciones:
- Aplicar migraciones en Supabase remoto (ver sección J).
- Verificar RLS en vivo con usuarios de prueba (Barbería A vs B) usando `supabase/verify_rls.sql`.
- Migrar frontend de reservas a la RPC `create_appointment_atomic` (migración lista).
- Añadir suite de tests (Vitest + Playwright + pgTAP) — propuesta en post-mortem.

No apto para producción masiva hasta completar tests de concurrencia y suite de tests. DB y RLS verificados.

## J. Guía de aplicación de migraciones (pendientes)

1. Crear `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ya creado con placeholders; completar).
2. Instalar Supabase CLI: `npm install -g supabase`.
3. Vincular: `supabase link --project-ref mrktwxjlltqqxkvktkku`.
4. Aplicar migraciones: `supabase db push`.
5. Verificar RLS: ejecutar `supabase/verify_rls.sql` en SQL Editor.
6. Verificar funciones: `SELECT proname FROM pg_proc WHERE proname IN ('create_appointment_atomic','is_super_admin','enforce_barber_limit')`.
7. (Opcional) Baseline de esquema: `supabase db pull` y commitear como `00000000000000_baseline_schema.sql`.

## K. Pendientes preparados (sin DB)

- `supabase/migrations/20260706_atomic_booking_rpc.sql`: RPC atómica de reservas lista.
- `supabase/verify_rls.sql`: script de verificación de RLS.
- Propuestas de mejora continua documentadas en post-mortem (tests, lint de RLS, contrato Edge Function, SW versionado, observabilidad).

## M. Tests y migración a RPC (completado)

- Instalado Vitest + React Testing Library + jsdom en el proyecto (sin dependencias globales).
- Configurado `vite.config.js` con entorno jsdom y setup file.
- Añadido script `npm run test` y `npm run test:watch`.
- Tests: `src/utils/format.test.js` (3 tests), `src/lib/constants.test.js` (7 tests). Total: 10 tests pasando.
- Migrado `BookingPage.jsx` para usar la RPC `create_appointment_atomic` (transacción atómica, selección automática de barbero, total con productos).
- Eliminado código de inserts directos y verificación manual de disponibilidad (ahora en la RPC).

## L. Aplicación en producción (completada)

Migraciones aplicadas en Supabase remoto (project Barberias / mrktwxjlltqqxkvktkku):
- `20260704_security_hardening.sql` — RLS + triggers + índices.
- `20260705_update_plan_prices.sql` — precios oficiales y límites.
- `20260706_atomic_booking_rpc.sql` — RPC atómica de reservas.
- `20260707_fix_search_path.sql` — search_path en 6 funciones SECURITY DEFINER.
- `20260708_super_admin_all.sql` — super_admin_all en tablas faltantes.

Verificación:
- Planes actualizados: Básico 100.000 (3 barberos, 1 sucursal, reservas ilimitadas), Profesional 150.000 (10, 3, ilimitadas), Premium 200.000 (ilimitado).
- Todas las tablas con RLS tienen policy `super_admin_all`.
- Todas las funciones SECURITY DEFINER tienen `search_path=public`.
- RPC `create_appointment_atomic` disponible.

## I. Actualización de precios y planes (Sección 20)

Precios oficiales aplicados:
- Básico: Gs. 100.000 (3 barberos, 1 sucursal)
- Profesional: Gs. 150.000 (10 barberos, 3 sucursales)
- Premium: Gs. 200.000 (ilimitado)

Cambios:
- `src/lib/constants.js`: precios y límites (ya alineados).
- `src/pages/admin/PlanesPage.jsx`: muestra '∞' para ilimitado (ya correcto).
- Nueva migración `20260705_update_plan_prices.sql`: UPSERT de los 3 planes con precios y límites en la tabla `plans`. Conserva suscripciones/históricos.
- Verificado: no existen precios antiguos activos en el flujo comercial (grep sin resultados para otros montos).