# Migraciones SQL — BarberShifts

Este directorio contiene el historial de migraciones del proyecto Supabase
`mrktwxjlltqqxkvktkku`. **Leer antes de aplicar cualquier migración.**

## 1. Estado actual (verificado contra producción)

| Versión    | Archivo                                        | Estado                                  |
| ---------- | ---------------------------------------------- | --------------------------------------- |
| 20260626   | `20260626_create_branches.sql`                 | Aplicada y registrada                   |
| 20260627   | `20260627_branches_rls.sql`                    | Aplicada y registrada                   |
| 20260628   | `20260628_branches_public_select.sql`          | Aplicada y registrada                   |
| 20260629   | `20260629_fix_hours_unique_constraint.sql`     | Aplicada y registrada                   |
| 20260630   | `20260630_fix_null_branch_appointments.sql`    | Aplicada y registrada                   |
| 20260703   | `20260703_fix_security_phase2.sql` (canónica)  | Aplicada en producción, **NO registrada** — ver §2 |
| 20260703   | `archive/20260703_fix_rls_branches_super_admin.sql` | Archivada (efecto ya aplicado) |
| 20260703   | `archive/20260703_fix_security_audit.sql`      | Archivada (efecto ya aplicado) |
| 20260704   | `20260704_security_hardening.sql`              | Aplicada y registrada                   |
| 20260705   | `20260705_update_plan_prices.sql`              | Aplicada y registrada                   |
| 20260706   | `20260706_atomic_booking_rpc.sql`              | Aplicada y registrada                   |
| 20260707   | `20260707_fix_search_path.sql`                 | Aplicada y registrada                   |
| 20260708   | `20260708_super_admin_all.sql`                 | Aplicada y registrada                   |
| 20260709   | `20260709_fix_rpc_total.sql`                   | Aplicada y registrada                   |
| **20260710** | **`20260710_security_and_booking_fixes.sql`** | **Aplicada y registrada (2026-11-07, STATUS 201, verificada)** — incluye `barber_read_notifications` aditiva |

Consulta del historial remoto:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

## 2. Anomalía 20260703 (consolidada en disco)

Existían tres archivos con prefijo `20260703` y **sus efectos ya están en producción**
(`super_admin_all` en todas las tablas, `complete_appointment` con `search_path`),
pero la versión `20260703` **no aparece** en `supabase_migrations.schema_migrations`.

**Acción realizada en el repositorio (no destructiva):**

- Conservada como canónica: `20260703_fix_security_phase2.sql`.
- Movidas a `supabase/migrations/archive/` (contenido preservado en git):
  - `20260703_fix_rls_branches_super_admin.sql`
  - `20260703_fix_security_audit.sql`

**Acción requerida en el proyecto Supabase (operativa):**

```bash
supabase migration repair --status applied 20260703
```

> **Estado:** `20260703` y `20260710` registrados en `supabase_migrations.schema_migrations`
> (2026-11-07). El comando anterior queda como referencia si se recrea el historial.

No volver a ejecutar los archivos archivados. Sus efectos están verificados y muchas
de sus definiciones son reemplazadas por `20260710`. Si `supabase db pull/push` sigue
en conflicto, revisar el historial remoto completo antes de forzar nada.

## 3. `20260710_security_and_booking_fixes.sql` — aplicada y verificada

**Estado:** aplicada el 2026-11-07 (Management API, STATUS 201) y registrada. Verificación
post-aplicación en verde: `btree_gist` (extensions), `appointments_no_overlap`, 5 RPCs,
`notify_new_appointment` SECURITY DEFINER + `search_path`, 0 políticas `anon` de escritura
en tablas privadas, `barber_read_notifications`, grants `anon` correctos
(`get_busy_slots`/`get_public_queue` sí; `complete_appointment`/`adjust_inventory_stock` no).
Smoke (rolled back): booking `true|20000.00`, `anon_clients=0`. Counts sin cambios.

**Referencia de aplicación** (si se requiere en otro entorno):

Procedimiento verificado (dry-run ejecutado dentro de `BEGIN … ROLLBACK` contra
producción, `STATUS 201`, sin persistencia):

1. **Respaldo lógico** de las tablas afectadas desde el dashboard
   (Database → Backups / Export): `appointments`, `appointment_services`,
   `appointment_products`, `clients`, `inventory_products`.
2. **Aplicar en el SQL Editor** del dashboard de Supabase (o con
   `psql -f supabase/migrations/20260710_security_and_booking_fixes.sql`) usando un
   rol con permisos DDL (`postgres`). La migración ya trae `BEGIN; … COMMIT;`.
3. **Verificar** post-aplicación (todas deben devolver el valor esperado):
   ```sql
   -- 1. btree_gist instalado en `extensions`
   select extname from pg_extension where extname = 'btree_gist';
   -- 2. restricción de no solapamiento
   select conname from pg_constraint where conname = 'appointments_no_overlap';
   -- 3. helpers públicos
   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and proname in ('get_busy_slots','get_public_queue');
   -- 4. trigger de notificación corregido y SECURITY DEFINER
   select prosecdef, proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and proname = 'notify_new_appointment';
   -- 5. ninguna política anónima de escritura directa en tablas privadas
   select policyname from pg_policies
   where schemaname = 'public' and 'anon' = any(roles)
     and tablename in ('appointments','appointment_services','appointment_products','clients');
   ```
4. **Smoke test funcional** (desde la app o con curl usando la anon key):
   - Crear una reserva pública → debe devolver `success: true` y persistir.
   - Abrir la pantalla TV → debe mostrar la cola.
   - Intentar leer `clients` con la anon key → debe devolver 0 filas / error.
5. Registrar la versión:
   ```bash
   supabase migration repair --status applied 20260710
   ```

### Rollback

La migración **no elimina tablas ni columnas**, pero sí elimina políticas
permisivas y añade una restricción `EXCLUDE`. Si algo falla:

```sql
BEGIN;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
DROP FUNCTION IF EXISTS public.get_busy_slots(uuid, date, uuid);
DROP FUNCTION IF EXISTS public.get_public_queue(uuid, date);
-- restaurar las políticas anteriores desde 20260704_security_hardening.sql
COMMIT;
```

Restaurar políticas requiere re-ejecutar el bloque de `CREATE POLICY` de la migración
`20260704` (sección 1). Mantener copia del `pg_policies` previo:

```sql
select * from pg_policies where schemaname = 'public';
```

## 4. Reglas del proyecto

- Una migración aplicada **no se edita**. Se corrige con una nueva migración.
- Toda migración nueva debe ser **idempotente** cuando sea razonable
  (`IF NOT EXISTS`, `DROP … IF EXISTS`, `CREATE OR REPLACE`).
- Prohibido: `DROP TABLE`, `DROP COLUMN`, borrado de datos, `DISABLE ROW LEVEL SECURITY`.
- Los cambios de esquema se entregan como archivo nuevo para revisión; no se aplican
  directamente en producción desde el flujo de desarrollo.
- `service_role` nunca se usa en frontend, logs ni respuestas de API.
