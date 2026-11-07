-- Verificacion de RLS: tablas con RLS habilitado sin policy super_admin_all
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = c.relname
      AND p.policyname = 'super_admin_all'
  )
ORDER BY c.relname;

-- Verificacion de funciones SECURITY DEFINER y su search_path
SELECT p.proname AS function_name,
       p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;