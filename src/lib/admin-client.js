import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

/**
 * Cliente con service_role key para operaciones administrativas
 * (creación de usuarios auth, etc.).
 * Solo usar en acciones de Super Admin autenticado.
 * @see https://supabase.com/docs/reference/javascript/admin-api
 */
export const adminClient = createClient(supabaseUrl || '', serviceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
