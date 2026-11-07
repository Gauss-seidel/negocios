# Auditoría final — BarberShifts

**Fecha:** 2026-11-07
**Rama:** `audit-final` (base `acec61c`)
**Proyecto Supabase:** `mrktwxjlltqqxkvktkku`
**Alcance:** seguridad multi-tenant, integridad de reservas/stock, planes y límites,
service worker, Edge Function `admin-super`, calidad de build y dependencias.

> Este documento reemplaza a `AUDIT_REPORT.md`. Toda afirmación marcada como
> **verificado** fue ejecutada contra producción (solo lectura o dentro de
> `BEGIN … ROLLBACK`, sin persistencia). Lo no ejecutado se lista explícitamente
> en la sección G.

---

## A. Resumen ejecutivo

**Clasificación actual: NO APTO para producción abierta.**
**Clasificación objetivo: APTO PARA PILOTO CONTROLADO**, únicamente después de
aplicar `20260710_security_and_booking_fixes.sql` y pasar los smoke tests de la
sección F.

Tres bloqueantes, todos con fix ya escrito y validado en dry-run:

| # | Bloqueante | Impacto | Estado |
|---|---|---|---|
| 1 | Trigger de notificación roto (`42703`) | **Toda** alta de reserva falla. Última reserva creada: 2026-07-15 20:58 UTC (hace ~3 meses 23 días) | Corregido en `20260710` §4c |
| 2 | Fuga de datos multi-tenant por políticas públicas | `anon` lee 22 clientes de 4 negocios, 26 reservas, 6 líneas de producto y 8 emails de barberos | Corregido en `20260710` §1, §10 |
| 3 | `anon` ejecuta `complete_appointment` | Se completó una reserva ajena con total 15.000 Gs. (probado) | Corregido en `20260710` §4, §9 |

El frontend, la Edge Function y el Service Worker ya están endurecidos y verificados
(lint, build, 14 tests, `npm audit --omit=dev` = 0 vulnerabilidades). **El orden de
despliegue importa: primero la migración, después el frontend.**

---

## B. Alcance y método

**Qué se auditó**

- 26 tablas de `public`, sus políticas RLS, funciones `SECURITY DEFINER`, triggers,
  constraints e índices.
- Rutas públicas (`/b/:slug`, booking, pantalla TV, marketplace) y su superficie de
  lectura anónima.
- Reserva, completado, cancelación y ajuste de stock: concurrencia, autorización,
  consistencia de totales e inventario.
- Planes y precios (Básico / Profesional / Premium) y su representación en UI.
- Edge Function `admin-super` (creación/edición/borrado de usuarios).
- `public/sw.js`, dependencias de producción y toolchain.

**Cómo**

- Introspección vía Management API (`/v1/projects/{ref}/database/query`) con token
  de acceso; sin credenciales de `service_role` en el repositorio.
- Simulación de roles reales con `SET LOCAL ROLE anon` / `authenticated` +
  `set_config('request.jwt.claims', …)`.
- Migración validada con `BEGIN … ROLLBACK` sobre producción: **STATUS 201**, cero
  persistencia (verificado post-ejecución: 0 clientes de prueba, 0 reservas de
  prueba, `btree_gist` no instalado, RPCs ausentes, constraint ausente,
  `notifications` en 0, `max(created_at)` sin cambios).
- Sin cambios destructivos: no se eliminaron tablas, columnas ni datos.

**Qué no se pudo ejecutar y por qué**

- `supabase db pull` / `db dump`: sin Docker/podman ni `pg_dump`/`psql` en PATH;
  además conflicto de historial en `20260703`.
- Migración local: no hay stack local (`ECONNREFUSED 127.0.0.1:54322`).
- Baseline de esquema generado por introspección del catálogo (no DDL ejecutable).
- Sin E2E de navegador (no forma parte de esta corrida).

---

## C. Hallazgos por severidad

### P0 — crítico, bloquea el piloto

**P0-1 · Alta de reservas completamente rota (trigger de notificación)**
- Hallazgo: `notify_new_appointment()` inserta en `notifications (user_id, title, body, data)`,
  columnas que no existen (el esquema real es
  `business_id, type, recipient, message, status, reference_type, reference_id`).
  Además corría como `INVOKER` y sin `search_path`.
- Evidencia (producción, rolled back):
  `INSERT INTO appointments … → 42703: column "user_id" of relation "notifications" does not exist`.
  `max(created_at)` en `appointments` = `2026-07-15 20:58:23+00`.
  Trigger confirmado: `on_appointment_created AFTER INSERT … notify_new_appointment()`.
- Fix (`20260710` §4c): función reescrita contra el esquema real, `SECURITY DEFINER`,
  `SET search_path = public` y guard `EXCEPTION WHEN OTHERS` para que una falla de
  notificación no aborte la reserva.

**P0-2 · Lectura anónima de datos privados de todos los negocios**
- Evidencia (rol `anon`, rolled back): 22 clientes / 4 negocios, 26 reservas,
  6 filas de `appointment_products`, 8 emails de `barbers`.
- Causa: políticas `public_read` / `public_insert` sobre `clients`, `appointments`,
  `appointment_services`, `appointment_products` (y lectura amplia en `barbers`).
- Fix (`20260710` §1, §10): se eliminan las políticas permisivas; la lectura pública
  se reemplaza por RPCs de mínimo privilegio (`get_busy_slots`, `get_public_queue`) y
  se revoca `SELECT` de columnas PII de `barbers` a `anon`.

**P0-3 · Escritura/ejecución anónima de operaciones de negocio**
- Evidencia: `anon` ejecutó `complete_appointment('9a3bd94f…')` → `{"success": true, "total": 15000.00}`.
  También existían políticas `INSERT` públicas en `appointments`, `appointment_services`,
  `appointment_products`, `clients`.
- Fix (`20260710` §4, §9): `complete_appointment` exige autorización por negocio
  (claims `app_metadata` **o** fila `business_staff`), y se revoca `EXECUTE` de
  funciones internas a `anon`.

### P1 — alto, corrige integridad y consistencia

**P1-1 · `create_appointment_atomic` sin validaciones reales**
- La versión en producción no validaba pertenencia ni stock de productos, no
  descontaba inventario, no comprobaba `barber_services`, vacaciones, feriados ni
  horario de atención, y no serializaba reservas concurrentes.
- Fix (`20260710` §3): validación completa + `pg_advisory_xact_lock` por negocio/día
  + precio y total calculados en DB (nunca desde el cliente).

**P1-2 · Stock no atómico**
- El cliente enviaba el valor final calculado; dos ventas concurrentes perdían
  actualizaciones y no quedaba movimiento.
- Fix (`20260710` §7b): `adjust_inventory_stock(p_product_id, p_delta, p_notes)`
  con `FOR UPDATE` y registro de movimiento.

**P1-3 · Sin garantía de no solapamiento a nivel DB**
- Solo se prevenía en la UI. Producción tenía 0 solapamientos (verificado con el
  predicado exacto), por lo que la restricción se pudo crear sin conflictos.
- Fix (`20260710` §8): `EXCLUDE USING gist (barber_id WITH =, tsrange(...) WITH &&)`
  parcial (`status NOT IN ('cancelled','no_show')`), con `btree_gist` en `extensions`.

**P1-4 · Sync de stock al cancelar/borrar/reactivar**
- Cancelar o borrar una reserva no devolvía el stock de sus productos.
- Fix (`20260710` §4b): trigger `sync_stock_on_appointment_change` idempotente sobre
  transiciones de estado y borrado.

**P1-5 · Límites de plan medidos sobre registros inactivos**
- Barberos y sucursales se contaban incluyendo inactivos, y no había enforcement a
  nivel DB (solo UI).
- Fix (`20260710` §7): triggers separados `BEFORE INSERT` y `BEFORE UPDATE` (no se
  puede usar `TG_OP`/`OLD` en el `WHEN` de un `BEFORE INSERT`), contando solo activos
  y respetando planes ilimitados.

### P2 — medio

- **P2-1 · Ilimitado filtrado a la UI**: Premium usa `999999` en DB (NOT NULL). El
  frontend ya centraliza el formateo en `src/utils/limits.js` (`isUnlimited`,
  `formatLimitShort`) y muestra “∞ / Ilimitado”; nunca el número.
- **P2-2 · Service Worker cacheaba Supabase**: riesgo de servir datos de otra sesión.
  Reescrito: cache-first solo para estáticos, Supabase excluido, `barbershifts-v2`.
- **P2-3 · Edge Function `admin-super`**: confiaba en metadatos arbitrarios y permitía
  escalada. Endurecida: rol leído de `app_metadata`, whitelist de campos, validación
  de pertenencia al negocio y limpieza de staff al borrar.
- **P2-4 · `search_path` mutable en funciones `SECURITY DEFINER`**: corregido en
  `20260707` y reforzado en todas las funciones nuevas de `20260710`.
- **P2-5 · Anti-spam global entre negocios**: `check_booking_spam` contaba reservas de
  todo el sistema; ahora acota por negocio (`20260710` §6).
- **P2-6 · Totales con producto cartesiano**: `20260709` y `20260710` §5 recalculan
  con subconsultas, no `JOIN` de dos tablas hijas.

### P3 — bajo / higiene

- Dependencias de producción con advisories (**corregidas**, ver F.5):
  `dompurify` 3.4.10 → 3.4.17 (crítico), `react-router-dom` 7.17.0 → 7.18.5 (alto).
- 23 warnings de ESLint (0 errores), mayormente `react-hooks` y variables sin usar.
- Duplicidad de tablas de auditoría: `audit_log` y `audit_logs`.
- `barber_services.price_override/duration_override` existen pero el booking no las usa.
- `notifications` no tiene política de lectura para barberos: el fix deja la escritura
  funcionando, pero la feature sigue incompleta (ver G).

---

## D. Evidencia ejecutada

### D.1 Invariantes de producción (solo lectura)

| Verificación | Resultado |
|---|---|
| Tablas con RLS habilitado | **26 / 26** |
| Reservas solapadas (predicado exacto de la constraint) | **0** |
| Stock negativo | **0** |
| Cajas abiertas duplicadas | **0** |
| Cajas abiertas | **0** (todas cerradas) |
| Operador `date + time` | `datetime_pl` (**IMMUTABLE**) |
| `public_read` en `services`, `inventory_products`, `business_hours`, `branches`, `barbers` | Existe y está acotada por estado del negocio |
| Planes en producción | Básico 100000 / 3 / 1 · Profesional 150000 / 10 / 3 · Premium 200000 / 999999 / 999999 |
| `max_monthly_bookings` | 999999 en los tres planes (reservas ilimitadas) |

### D.2 Evidencia “antes” (rol `anon`, `BEGIN … ROLLBACK`)

| ID | Resultado |
|---|---|
| `anon_can_read_clients` | 22 clientes / 4 negocios |
| `anon_can_read_appointments` | 26 reservas |
| `anon_can_read_appointment_products` | 6 filas |
| `anon_can_read_barber_email` | 8 emails |
| `anon_can_complete_appointment` | `{"success": true, "total": 15000.00}` |
| `direct_insert_appointment` | `42703: column "user_id" of relation "notifications" does not exist` |

Post-ejecución (sin persistencia): 26 reservas, 22 clientes, 6 líneas de producto,
0 notificaciones, stock 5, reserva muestra `completed / 15000.00` sin cambios.

### D.3 Dry-run de la migración `20260710`

- **STATUS 201** en producción dentro de `BEGIN … ROLLBACK`.
- Post-ejecución: 0 clientes de prueba, 0 reservas de prueba, `btree_gist` no
  instalado, `get_busy_slots` ausente, constraint ausente, `notifications` en 0,
  última reserva sin cambios → **cero persistencia**.

### D.4 Suites de integración sobre el esquema migrado (rolled back)

**Suite 1 — 11/11 OK**

| Check | Resultado |
|---|---|
| `create_appointment_atomic` reserva base | `total 20000.00`, `end_time 10:10` |
| Persistencia dentro de la transacción | OK |
| `get_busy_slots` | Devuelve el slot ocupado |
| `get_public_queue` | Devuelve la cola del negocio |
| `anon` lectura directa de `clients` | 0 filas |
| `anon` lectura directa de `appointments` | 0 filas |
| `anon` lectura directa de `appointment_products` | 0 filas |
| `anon` `EXECUTE complete_appointment` | Bloqueado |
| `anon` `EXECUTE adjust_inventory_stock` | Bloqueado |
| `anon` `INSERT` directo | Bloqueado |
| Total recalculado en DB | Correcto |

**Suite 2 — 12/12 OK (multi-tenant e invariantes)**

| Check | Resultado |
|---|---|
| `x1` reserva base | OK, `total 20000.00` |
| `x2` solapamiento exacto | Rechazado: “Horario no disponible” |
| `x3` solapamiento parcial (10:05) | Rechazado: “Horario no disponible” |
| `x4` `get_busy_slots` refleja la reserva | `n=1 start=10:00` |
| `x5` producto de otro negocio | Rechazado: “Producto no disponible” |
| `x6` producto propio con stock | OK, `total 110000.00` |
| `x7` `INSERT` directo solapado | Viola exclusión (`23P01`) |
| `x8` admin del propio negocio completa | OK |
| `x9` ajuste de stock propio | OK |
| `x10` admin de otro negocio completa | Bloqueado: “No autorizado” |
| `x11` admin de otro negocio ajusta stock | Bloqueado: “No autorizado” |
| `x12` barbero autorizado solo por `business_staff` (sin `app_metadata`) | OK |

> Nota: `x10` inicialmente pasaba por RLS y no por la rama de autorización. Se
> corrigió el test capturando el `appointment_id` del RPC y llamando por ID; ahora
> falla en la validación de negocio (`No autorizado`), que es lo que se quería probar.

### D.5 Frontend, build y dependencias

| Comando | Resultado |
|---|---|
| `npm run lint` | **0 errors**, 23 warnings |
| `npm run build` | OK — `index 251.37 kB` / gzip `77.82 kB`; `built in 577ms` |
| `npm run test` | **3 archivos / 14 tests passed** (2.49 s) |
| `npm audit --omit=dev` | **0 vulnerabilidades** |
| `npm audit` (incluye dev) | 12 advisories (5 moderate, 7 high) — toolchain Vite/launch-editor/zod, no llegan al bundle |

Se verificó además que `dist/assets/*.js` no contiene `service_role`, `sb_secret` ni
una JWT de servicio.

---

## E. Cambios entregados

**Base de datos (para revisión, no aplicada por este audit)**

- `supabase/migrations/20260710_security_and_booking_fixes.sql` — 1.088 líneas, 11 bloques:
  1. cierre de superficie anónima; 2. `get_busy_slots` / `get_public_queue`;
  3. booking atómico endurecido; 4. `complete_appointment` autorizado + stock atómico;
  4b. sync de stock por cambio de estado; 4c. **fix P0 de notificaciones**;
  5. totales sin producto cartesiano; 6. anti-spam por negocio; 7. límites de plan
  consistentes; 7b. `adjust_inventory_stock`; 8. constraint de no solapamiento;
  9. `EXECUTE` revocado a `anon`; 10. PII de barberos oculta a `anon`;
  11. índices de apoyo para RLS y consultas públicas.

**Frontend**

- `BookingPage.jsx`: reserva vía `create_appointment_atomic`, disponibilidad vía
  `get_busy_slots`, filtrado de barberos por `barber_services`, columnas explícitas.
- `TVQueue.jsx`: cola vía `get_public_queue`, corrección de fecha local.
- `InventoryPage.jsx`: ajuste de stock vía `adjust_inventory_stock`.
- `limits.js` + `usePlan` + `PlansPage` + `PlanesPage` + `BarbersPage` + `SucursalesPage`:
  representación única de planes ilimitados.
- `AuthContext.jsx`: `extractClaims` estabilizado con `useCallback`.
- `sw.js`: Supabase fuera de caché, `barbershifts-v2`.
- Limpieza de warnings en 20+ páginas (`useMemo`, `useCallback`, columnas explícitas).

**Backend / Edge**

- `supabase/functions/admin-super/index.ts`: autorización por `app_metadata`, whitelist
  de metadatos, validación de negocio, limpieza de `business_staff`.

**Tooling y documentación**

- Vitest + Testing Library (`vite.config.js`, `src/test/setup.js`).
- `src/utils/limits.test.js`, `src/utils/format.test.js`, `src/lib/constants.test.js`.
- `docs/SCHEMA_BASELINE.md` (26 tablas, 222 columnas, 90 constraints, 69 índices,
  117 políticas RLS, 23 funciones, 25 triggers).
- `supabase/migrations/README.md` (estado, anomalía `20260703`, procedimiento de aplicación).
- `package.json`: `test`, `test:watch`; deps de producción actualizadas.
- Eliminado `APPLY_ALL.sql` (artefacto derivado e incompleto).

---

## F. Orden de aplicación y despliegue (obligatorio)

El frontend nuevo depende de RPCs y permisos que **solo existen después de la migración**.

1. **Resolver el historial `20260703`** (tres archivos, una versión, efectos ya en
   producción, ausentes de `schema_migrations`). Ver `supabase/migrations/README.md` §2.
2. **Backup lógico**: `appointments`, `appointment_services`, `appointment_products`,
   `clients`, `inventory_products`; guardar `select * from pg_policies`.
3. **Aplicar `20260710`** con el SQL Editor del dashboard o `psql -f` como `postgres`.
4. **Verificar** (queries en `README.md` §3): `btree_gist`, `appointments_no_overlap`,
   `get_busy_slots`, `get_public_queue`, `notify_new_appointment` con
   `prosecdef = true`, cero políticas `anon` de escritura en tablas privadas.
5. **Smoke test** con la anon key: crear reserva (persiste), abrir TV (cola visible),
   leer `clients` (0 filas), intentar `complete_appointment` como anon (rechazado).
6. **Desplegar frontend** (build + hosting).
7. **Registrar** la migración: `supabase migration repair --status applied 20260710`.

Si se despliega el frontend antes del paso 3: la pantalla TV falla (falta
`get_public_queue`), la disponibilidad falla (falta `get_busy_slots`) y el ajuste de
stock falla (falta `adjust_inventory_stock`).

---

## G. Verificación pendiente (no ejecutada en este audit)

1. **Navegador / E2E**: recorrido público completo y panel admin con usuario real.
2. **Carga y concurrencia reales**: N reservas simultáneas al mismo slot desde clientes
   separados (el lock y la exclusión se validaron en DB, no bajo carga HTTP).
3. **Restauración de backup**: simulacro real de restore (no hay drill documentado).
4. **Monitoreo/alertas**: no hay uptime, alertas de error ni captura de logs en prod.
5. **`notifications` para barberos**: hoy solo `business_admin`/`super_admin` pueden
   leer; decidir si se agrega política de lectura para `barber` o se elimina el insert.
6. **`barber_services.price_override` / `duration_override`**: sin uso en booking;
   decidir implementar o eliminar.
7. **Transiciones de estado arbitrarias**: si el panel admin permite pasar de
   `completed` a `cancelled`, reverificar el sync de stock y la caja.
8. **Duplicidad `audit_log` / `audit_logs`**: consolidar.
9. **CORS `*` en `admin-super`**: aceptable con bearer token, pero conviene restringir
   al dominio de la app.
10. **`npm audit` completo**: 12 advisories dev-only; actualizar toolchain cuando haya
    versión compatible (no afecta el bundle de producción).

---

## H. Clasificación de lanzamiento

| Criterio | Estado |
|---|---|
| Aislamiento multi-tenant verificable en DB | ❌ antes / ✅ después de `20260710` |
| Alta de reservas funcional | ❌ hoy (P0 trigger) / ✅ después |
| Operaciones sensibles no ejecutables por `anon` | ❌ antes / ✅ después |
| Integridad de stock y totales | ❌ antes / ✅ después |
| Sin solapamientos (DB) | ❌ antes / ✅ después |
| Secretos y `service_role` fuera del frontend | ✅ |
| Dependencias de producción sin advisories | ✅ |
| Build, lint y tests en verde | ✅ (23 warnings, 0 errores) |
| Planes y precios correctos | ✅ |
| E2E de navegador | ❌ pendiente |
| Monitoreo y restore drill | ❌ pendiente |

**Veredicto:** no lanzar a producción abierta hasta cerrar G.1–G.4.
Con `20260710` aplicado y los smoke tests de F.5 en verde, el sistema queda
**apto para un piloto controlado** con un número limitado de barberías, sujeta a
observación diaria.

---

## I. Cómo reproducir la evidencia

```powershell
# Frontend
npm ci
npm run lint
npm run build
npm run test
npm audit --omit=dev

# Baseline de esquema (solo lectura)
$env:SUPABASE_ACCESS_TOKEN = "<token>"      # nunca commitear
$env:SUPABASE_PROJECT_REF  = "mrktwxjlltqqxkvktkku"
python scripts/generate_schema_baseline.py
```

La migración se validó ejecutando su contenido dentro de un bloque
`BEGIN; … <tests>; ROLLBACK;` contra la Management API. Los scripts de dry-run e
integración usados están en `%TEMP%\opencode\` (`dry_run_tests.py`,
`dry_run_tests_ext.py`, `evidence_before.py`) y **no** se versionan porque requieren
un token de acceso personal y contienen UUIDs de producción.
