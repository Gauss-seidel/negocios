# Auditoría final — BarberShifts

**Fecha:** 2026-11-07 (aplicación en producción: 2026-11-07)
**Rama:** `audit-final` (base `acec61c`, commits `7672f04`, `2c3a797`, + commit de aplicación)
**Proyecto Supabase:** `mrktwxjlltqqxkvktkku`
**Alcance:** seguridad multi-tenant, integridad de reservas/stock, planes y límites,
service worker, Edge Function `admin-super`, calidad de build y dependencias.

> Este documento reemplaza a `AUDIT_REPORT.md`. Las afirmaciones marcadas
> **verificado** se ejecutaron contra producción (solo lectura, `BEGIN … ROLLBACK`,
> o —cuando se indica explícitamente— **aplicación autorizada** por el propietario).
> Lo que queda fuera del alcance de este entorno se lista en la sección G.

---

## A. Resumen ejecutivo

**Clasificación: APTO PARA PRODUCCIÓN ABIERTA (código y base de datos verificados)**,
condicionado a completar los prerequisitos operativos de la sección G (monitoreo,
E2E, prueba de carga, simulacro de restore, CORS de dominio). Los bloqueantes P0/P1/P2
de código/DB **fueron corregidos y aplicados en producción** con autorización explícita
del propietario.

| # | Bloqueante | Evidencia “antes” | Estado en producción |
|---|---|---|---|
| 1 | Trigger de notificación roto (`42703`) | `INSERT appointments` fallaba; última reserva `2026-07-15 20:58:23Z` | **Corregido y aplicado** (`notify_new_appointment` `SECURITY DEFINER`, `search_path=public`, columnas reales, `EXCEPTION`) |
| 2 | Fuga multi-tenant por políticas públicas | `anon` leía 22 clientes/4 negocios, 26 reservas, 6 líneas, 8 emails | **Corregido y aplicado** (0 políticas `anon` de escritura en tablas privadas; `anon_clients=0` en smoke post-aplicación) |
| 3 | `anon` ejecutaba `complete_appointment` | Reserva ajena completada con 15.000 Gs (rolled back) | **Corregido y aplicado** (`EXECUTE` revocado a `anon`; `adjust_inventory_stock` también revocado) |

**Aplicación real ejecutada (autorizada):** `20260710_security_and_booking_fixes.sql`
→ Management API **STATUS 201** (con transacción `BEGIN/COMMIT` del archivo).
Historial `20260703` registrado en `supabase_migrations.schema_migrations`;
`20260710` registrado (`version 20260710, security_and_booking_fixes`).
`docs/pre_20260710_backup_snapshot.json` guarda counts + 117 políticas previas (sin PII).

**Smoke post-aplicación (rolled back):** booking vía `create_appointment_atomic`
`true|20000.00` (ejercita el trigger corregido); `anon_clients=0`;
`anon` ve `get_busy_slots` (1 slot de prueba) y puede ejecutar `get_public_queue`
(3 args, `EXECUTE` ok). **Counts sin cambios:** 26 appointments, 22 clients, 0 notifications.

---

## B. Alcance y método

**Auditado:** 26 tablas `public`, RLS/políticas, funciones `SECURITY DEFINER`,
triggers, constraints e índices; rutas públicas (booking, TV, marketplace);
reserva/completado/cancelación/stock; planes/límites; `admin-super`; `sw.js`;
dependencias.

**Método:** introspección vía Management API (token de acceso; sin `service_role` en
repo). Simulación con `SET LOCAL ROLE anon/authenticated` + `request.jwt.claims`.
Validación previa con `BEGIN…ROLLBACK` (**STATUS 201, 0 persistencia**). Aplicación
final autorizada (STATUS 201) + verificación post-aplicación + smoke tests rolled back.
Sin operaciones destructivas: no se eliminaron tablas, columnas ni datos.

**No ejecutable desde este entorno:** E2E de navegador, carga HTTP concurrente real,
monitoreo/alertas gestionado, simulacro de restore de infraestructura, restricción CORS
al dominio real (dominio no provisto). Baseline por introspección de catálogo (sin
`pg_dump`/Docker).

---

## C. Hallazgos (resumen) y estado

- **P0-1** trigger `notify_new_appointment` incompatible con esquema `notifications` →
  corregido (columnas reales, `SECURITY DEFINER`, `search_path`, `EXCEPTION WHEN OTHERS`).
  **Verificado post-aplicación:** booking atómico retorna éxito dentro de transacción.
- **P0-2** lectura anónima de PII multi-tenant → políticas/privilegios cerrados;
  acceso público solo por RPCs de mínimo privilegio. **Verificado:** `anon_clients=0`.
- **P0-3** ejecución anónima de operaciones sensibles → `REVOKE EXECUTE` a `anon` +
  autorización por negocio. **Verificado:** `complete_appointment`/`adjust_inventory_stock`
  no ejecutables por `anon`; `get_busy_slots`/`get_public_queue` sí.
- **P1** booking atómico endurecido (validaciones, lock por negocio/día, precios en DB),
  stock atómico `FOR UPDATE` + movimientos, sync de stock por cambio de estado, constraint
  `EXCLUDE gist` `appointments_no_overlap` (`btree_gist` en `extensions`), límites de
  plan consistentes (triggers separados INSERT/UPDATE, solo activos), totales sin
  producto cartesiano, anti-spam por negocio.
- **P2** límites ilimitados centralizados (`999999` → `∞`), SW sin cachear Supabase
  (`barbershifts-v2`), `admin-super` endurecida (`app_metadata`, whitelist), `search_path`
  fijo en `SECURITY DEFINER`, `barber_read_notifications` (additiva, idempotente).
- **P3 resueltos en repo**: deps prod actualizadas (`react-router-dom@7.18.5`,
  `dompurify@3.4.17`, `npm audit --omit=dev` 0). Quedan 22 warnings lint, 12 advisories
  dev-only, y decisiones de producto/operación (sección G).

---

## D. Evidencia ejecutada

### D.1 Pre-aplicación (producción, solo lectura / rolled back)
- RLS 26/26; 0 solapamientos; 0 stock negativo; 0 cajas abiertas duplicadas; `date+time`
  → `datetime_pl` (IMMUTABLE); planes 100000/3/1 · 150000/10/3 · 200000/999999/999999.
- **Antes (anon, rolled back):** 22 clientes/4 negocios, 26 reservas, 6 `appointment_products`,
  8 emails; `complete_appointment` → `success:true total:15000`; `INSERT` → `42703`.
- Dry-run `20260710`: **STATUS 201, 0 persistencia**. Integración rolled back: **11/11 + 12/12**
  (solapamiento exacto/parcial, `23P01` `EXCLUDE`, cross-business rechazado, admin ajeno
  bloqueado, barbero autorizado por `business_staff`).

### D.2 Aplicación y verificación post-aplicación (autorizada)
| Verificación | Resultado |
|---|---|
| Aplicación `20260710` (BEGIN/COMMIT) | **STATUS 201** |
| `btree_gist` en `extensions` | OK |
| Constraint `appointments_no_overlap` | OK |
| RPCs `adjust_inventory_stock`, `complete_appointment`, `create_appointment_atomic`, `get_busy_slots`, `get_public_queue` | OK |
| `notify_new_appointment` `prosecdef=true`, `search_path=public` | OK |
| Políticas `anon` de escritura (INSERT/UPDATE/DELETE/ALL) en `appointments/appointment_services/appointment_products/clients/barbers/inventory_products` | **0** |
| `barber_read_notifications` (SELECT) | OK |
| `EXECUTE` anon: `get_busy_slots` / `get_public_queue` | **true / true** |
| `EXECUTE` anon: `complete_appointment` / `adjust_inventory_stock` | **false / false** |
| `schema_migrations` incluye `20260703` y `20260710` | OK |
| Counts post-aplicación | 26 appointments, 22 clients, 0 notifications (sin cambios) |

### D.3 Smoke post-aplicación (rolled back)
| Check | Resultado |
|---|---|
| `create_appointment_atomic` (ejercita trigger corregido) | `true|20000.00` |
| `anon` lee `clients` | `0` |
| `anon` `get_busy_slots` | `1` (slot de prueba en transacción) |
| `anon` `get_public_queue(biz,NULL,date)` | ejecuta (`count>=0`), `EXECUTE` ok |

### D.4 Frontend / calidad
| Comando | Resultado |
|---|---|
| `npm run lint` | **0 errores, 22 warnings** |
| `npm run build` | OK — `index 251.37 kB` / gzip `77.82 kB` |
| `npm run test` | **3 archivos / 16 tests passed** |
| `npm audit --omit=dev` | **0 vulnerabilidades** |
| `npm audit` (completo) | 12 advisories dev-only (toolchain) |

Sin `service_role`/`sb_secret`/token real en `dist` ni en archivos versionados.
Backup de metadatos pre-migración: `docs/pre_20260710_backup_snapshot.json`.

---

## E. Cambios entregados

- **DB (APLICADO):** `20260710_security_and_booking_fixes.sql` — cierre superficie anónima;
  RPCs públicas mínimas; booking atómico; completado/ajuste de stock autorizados y
  atómicos; sync stock por estado; fix P0 notificaciones; totales sin cartesiano;
  anti-spam por negocio; límites de plan; `EXCLUDE` no-solapamiento + `btree_gist`;
  `REVOKE EXECUTE` a `anon`; PII barberos; índices; `barber_read_notifications`.
- **Frontend:** Booking/TV/Inventario vía RPCs; límites ilimitados centralizados;
  TVQueue sin stale closure ni flash de carga en refresh; `sw.js` v2 sin cachear Supabase;
  limpieza en 20+ páginas. **Desplegar este frontend** (ya alineado con las RPCs aplicadas).
- **Edge:** `admin-super` endurecida.
- **Repo/higiene:** `20260703` consolidado (`phase2` canónica, duplicados en `archive/`);
  historial `schema_migrations` reparado (20260703, 20260710); Vitest (16 tests);
  `docs/SCHEMA_BASELINE.md`; `supabase/migrations/README.md`; `pre_20260710_backup_snapshot.json`.

---

## F. Estado de despliegue

- [x] Backup lógico de metadatos/policies + counts (snapshot JSON). *Recomendado además:
  export/backup completo desde el dashboard de Supabase.*
- [x] Historial `20260703` registrado. [x] Consolidación en disco.
- [x] `20260710` **aplicada** (STATUS 201) y **registrada**.
- [x] Verificaciones post-aplicación y smoke tests (API, rolled back) en verde.
- [ ] **Desplegar frontend** del branch `audit-final` al hosting de producción (build
  verificado). El frontend depende de las RPCs ya aplicadas — desplegar ahora es seguro.
- [ ] Completar prerequisitos operativos de la sección G para operación abierta sostenida.

Rollback de `20260710` (si fuera necesario): `DROP CONSTRAINT IF EXISTS appointments_no_overlap`;
`DROP FUNCTION IF EXISTS` de las RPCs nuevas; restaurar políticas desde
`docs/pre_20260710_backup_snapshot.json` / bloque de `20260704`. La migración no borra
tablas ni columnas.

---

## G. Prerequisitos operativos pendientes (fuera de este entorno)

1. **E2E en navegador** (flujo público, booking, TV, admin/barbero con usuarios reales).
2. **Concurrencia HTTP real** (N reservas simultáneas al mismo slot).
3. **Monitoreo/alertas** (uptime, errores de Edge/DB, latencia) y revisión de logs.
4. **Simulacro de restore** verificado sobre el backup real del proveedor.
5. **CORS de `admin-super`** restringido al dominio de producción (actualmente `*`; bearer
   token mitiga, pero conviene restringir) — requiere conocer el dominio.
6. **Decisión de producto:** `barber_read_notifications` filtra por negocio/rol; validar que
   el alcance sea el deseado. `barber_services.price_override/duration_override` siguen sin
   usarse en booking. `audit_log`/`audit_logs` duplicadas.
7. **Toolchain dev:** 12 advisories dev-only (Vite/launch-editor/zod).

---

## H. Clasificación de lanzamiento

| Criterio | Estado |
|---|---|
| P0 (reserva rota, fuga, ejecución anónima) | **Resueltos y aplicados** |
| Aislamiento multi-tenant en DB | **Verificado post-aplicación** |
| Integridad stock/totales/no-solapamiento | **Verificado** (DB + smoke) |
| Secretos/`service_role` fuera del frontend | OK |
| Deps prod sin advisories | OK |
| Build/lint/tests | OK (0 errores, 22 warnings, 16 tests) |
| Migración aplicada + historial reparado | OK |
| Frontend desplegado | **Pendiente** (acción de hosting) |
| E2E navegador / carga HTTP | Pendiente |
| Monitoreo + restore drill | Pendiente |

**Veredicto:** el sistema está **técnicamente endurecido y verificado en base de datos y
código** para operación en producción abierta. Para sostener producción abierta con
riesgo controlado, completar F (deploy frontend) y G.1–G.4/G.5.

---

## I. Reproducción

```powershell
npm ci; npm run lint; npm run build; npm run test; npm audit --omit=dev
$env:SUPABASE_ACCESS_TOKEN="<token>"; $env:SUPABASE_PROJECT_REF="mrktwxjlltqqxkvktkku"
python scripts/generate_schema_baseline.py
```

Consultas de verificación post-aplicación y rollback: `supabase/migrations/README.md`.
Snapshot pre-migración: `docs/pre_20260710_backup_snapshot.json`. Scripts ad-hoc usados
en la auditoría (con token/UUIDs) se mantuvieron fuera del repo (`%TEMP%\opencode\`).