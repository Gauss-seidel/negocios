# Migrations Guide — BarberShifts

> Cómo crear y aplicar migraciones SQL en Supabase.

## Convención de nombres

```
YYYYMMDD_descripcion.sql
```

Ejemplos:
```
20260615000001_schema.sql
20260615000002_rls.sql
20260703_fix_security_audit.sql
20260703_fix_security_phase2.sql
20260703_fix_rls_branches_super_admin.sql
```

## Orden de migraciones aplicadas

```
20260615... schema
20260615... rls
20260615... seed
20260615... fix_template_id_type
20260615... fix_column_mismatches
20260615... fix_rls_public_insert
20260615... prevent_double_booking
20260621... fix_plan_slugs
20260622... transfer_appointment
20260625... productos_en_reserva
20260625... add_google_maps_url
20260625... complete_appointment_function
20260626... create_branches
20260627... branches_rls
20260628... branches_public_select
20260629... fix_hours_unique
20260630... fix_null_branch_appointments
20260703... fix_security_audit
20260703... fix_security_phase2
20260703... fix_rls_branches_super_admin
```

## Cómo aplicar una migración

### Opción 1: Supabase CLI (recomendada)

```bash
cd frontend
supabase db query --linked --file "supabase/migrations/20260703_mi_migracion.sql"
```

### Opción 2: SQL Editor (Dashboard)

Si el CLI falla por timeout o red:
1. Ir a https://supabase.com/dashboard/project/mrktwxjlltqqxkvktkku
2. SQL Editor → New Query
3. Pegar el SQL
4. Run

## Buenas prácticas

1. **Siempre usar `IF NOT EXISTS` / `OR REPLACE`** para que la migración sea idempotente
2. **Usar `SET search_path = public`** en funciones SECURITY DEFINER (error #1)
3. **Probar en local** antes de aplicar a producción si es posible
4. **Documentar el propósito** al inicio del archivo SQL como comentario
5. **No borrar migraciones viejas** — se aplican en orden secuencial

## Funciones de ayuda

```sql
-- Verificar functions existentes
SELECT routine_name FROM information_schema.routines
WHERE routine_type = 'FUNCTION' AND specific_schema = 'public'
ORDER BY routine_name;

-- Verificar policies
SELECT tablename, policyname, cmd FROM pg_policies ORDER BY tablename;

-- Verificar triggers
SELECT event_object_table, trigger_name FROM information_schema.triggers;

-- Verificar constraints
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'inventory_products'::regclass AND contype = 'c';

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'appointment_products';
```

## Edge Functions

No son migraciones, pero se deployan aparte:

```bash
supabase functions deploy admin-super
```

Actualmente hay 1 Edge Function: `admin-super` (4 versiones deployadas).
