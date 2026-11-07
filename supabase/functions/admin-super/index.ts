import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Restringir en producción vía secrets de la función:
//   supabase secrets set ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
// Si no se configura, permite '*' para no romper entornos existentes.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? '*'
      : ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function respond(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeadersFor(req) },
  })
}

const ALLOWED_ADMIN_ROLES = ['super_admin', 'business_admin', 'barber'] as const
type AdminRole = (typeof ALLOWED_ADMIN_ROLES)[number]

interface CreateUserPayload {
  action: 'create_user'
  email: string
  password: string
  role: string
  business_id?: string
  name?: string
}

interface UpdateUserPayload {
  action: 'update_user'
  user_id: string
  app_metadata: Record<string, unknown>
}

interface DeleteUserPayload {
  action: 'delete_user'
  user_id: string
  business_id?: string
}

type Payload = CreateUserPayload | UpdateUserPayload | DeleteUserPayload

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) })
  }

  try {
    if (req.method !== 'POST') {
      return respond(req, { success: false, error: 'Method not allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return respond(req, { success: false, error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')

    const contentType = req.headers.get('Content-Type')
    if (!contentType || !contentType.includes('application/json')) {
      return respond(req, { success: false, error: 'Content-Type must be application/json' }, 400)
    }

    let body: Payload
    try {
      body = await req.json()
    } catch {
      return respond(req, { success: false, error: 'Invalid JSON body' }, 400)
    }

    if (!body.action) {
      return respond(req, { success: false, error: 'Missing action field' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return respond(req, { success: false, error: 'Invalid or expired session token' }, 401)
    }

    // Rol confiable desde app_metadata (solo service_role puede modificarlo)
    const callerRole = (user.app_metadata?.role as string) ?? null
    const callerBusinessId = (user.app_metadata?.business_id as string) ?? null

    if (callerRole !== 'super_admin' && callerRole !== 'business_admin') {
      return respond(req, { success: false, error: 'Forbidden: requires super_admin or business_admin role' }, 403)
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceRoleKey) {
      return respond(req, { success: false, error: 'Server misconfiguration' }, 500)
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    switch (body.action) {
      case 'create_user': {
        const { email, password, role, business_id, name } = body as CreateUserPayload

        if (!email || !password || !role) {
          return respond(req, { success: false, error: 'Missing required fields: email, password, role' }, 400)
        }
        if (!isValidEmail(email)) {
          return respond(req, { success: false, error: 'Invalid email format' }, 400)
        }
        if (typeof password !== 'string' || password.length < 6) {
          return respond(req, { success: false, error: 'Password must be at least 6 characters' }, 400)
        }
        if (!ALLOWED_ADMIN_ROLES.includes(role as AdminRole)) {
          return respond(req, { success: false, error: 'Invalid role' }, 400)
        }

        // Escalation prevention
        if (role === 'super_admin' && callerRole !== 'super_admin') {
          return respond(req, { success: false, error: 'Forbidden: cannot create super_admin' }, 403)
        }
        if (role === 'business_admin' && callerRole !== 'super_admin') {
          return respond(req, { success: false, error: 'Forbidden: only super_admin can create business_admin' }, 403)
        }

        // business_admin caller can only create barbers within their own business
        let resolvedBusinessId: string | undefined = business_id
        if (callerRole === 'business_admin') {
          if (!callerBusinessId) {
            return respond(req, { success: false, error: 'Caller has no business_id in metadata' }, 403)
          }
          if (role !== 'barber') {
            return respond(req, { success: false, error: 'business_admin can only create barber users' }, 403)
          }
          if (business_id && business_id !== callerBusinessId) {
            return respond(req, { success: false, error: 'Cannot create users for another business' }, 403)
          }
          resolvedBusinessId = callerBusinessId
        }

        // Validate business exists when provided
        if (resolvedBusinessId) {
          const { data: biz, error: bizErr } = await adminClient
            .from('businesses').select('id').eq('id', resolvedBusinessId).maybeSingle()
          if (bizErr || !biz) {
            return respond(req, { success: false, error: 'Business not found' }, 400)
          }
        } else if (role === 'business_admin' || role === 'barber') {
          // business_admin/barber require a business; super_admin creating business_admin may omit initially
          if (role === 'barber') {
            return respond(req, { success: false, error: 'business_id is required for barber' }, 400)
          }
        }

        const app_metadata: Record<string, string> = { role }
        if (resolvedBusinessId) {
          app_metadata.business_id = resolvedBusinessId
        }

        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata,
        })

        if (error) {
          return respond(req, { success: false, error: error.message }, 400)
        }

        const newUserId = data.user.id

        // If creating a super_admin, register in super_admins table
        if (role === 'super_admin') {
          const { error: saErr } = await adminClient.from('super_admins').insert([
            { id: newUserId, name: (name && name.trim()) || email },
          ])
          if (saErr) {
            // Roll back auth user to avoid orphan
            await adminClient.auth.admin.deleteUser(newUserId)
            return respond(req, { success: false, error: `Failed to register super_admin: ${saErr.message}` }, 400)
          }
        }

        return respond(req, { success: true, data: { user: data.user } })
      }

      case 'update_user': {
        const { user_id, app_metadata } = body as UpdateUserPayload

        if (!user_id || !app_metadata || typeof app_metadata !== 'object') {
          return respond(req, { success: false, error: 'Missing required fields: user_id, app_metadata' }, 400)
        }

        // Only super_admin may update users via this endpoint
        if (callerRole !== 'super_admin') {
          return respond(req, { success: false, error: 'Forbidden: only super_admin can update users' }, 403)
        }

        const { data: targetUser, error: lookupError } = await adminClient.auth.admin.getUserById(user_id)
        if (lookupError || !targetUser?.user) {
          return respond(req, { success: false, error: lookupError?.message ?? 'User not found' }, 404)
        }

        const targetRole = (targetUser.user.app_metadata?.role as string) ?? null

        // Whitelist allowed app_metadata fields
        const allowedMetaFields = ['role', 'business_id']
        const sanitizedMeta: Record<string, unknown> = {}
        for (const key of allowedMetaFields) {
          if (key in app_metadata) sanitizedMeta[key] = app_metadata[key]
        }
        if (Object.keys(sanitizedMeta).length === 0) {
          return respond(req, { success: false, error: 'No valid app_metadata fields provided' }, 400)
        }

        // Validate role if provided
        const newRole = sanitizedMeta.role as string | undefined
        if (newRole && !ALLOWED_ADMIN_ROLES.includes(newRole as AdminRole) && newRole !== 'customer') {
          return respond(req, { success: false, error: 'Invalid role in app_metadata' }, 400)
        }

        // Validate business_id if provided
        const newBusinessId = sanitizedMeta.business_id as string | undefined
        if (newBusinessId) {
          const { data: biz, error: bizErr } = await adminClient
            .from('businesses').select('id').eq('id', newBusinessId).maybeSingle()
          if (bizErr || !biz) {
            return respond(req, { success: false, error: 'Business not found' }, 400)
          }
        }

        // Prevent non-super from escalating (caller already super_admin here) - extra guard
        if (newRole === 'super_admin' && targetRole !== 'super_admin') {
          // only super_admin caller allowed (already enforced)
        }

        // Use sanitized metadata
        ;(body as UpdateUserPayload).app_metadata = sanitizedMeta

        // Prevent escalation: a business_admin cannot become super_admin unless caller super_admin (already)
        // Additional: do not allow changing a super_admin into a lower role to hijack? Allow super_admin management.
        // Impedir que se asigne super_admin a alguien que no lo era? Already caller is super_admin, ok.

        const { data, error } = await adminClient.auth.admin.updateUserById(
          user_id,
          { app_metadata: sanitizedMeta },
        )

        if (error) {
          return respond(req, { success: false, error: error.message }, 400)
        }

        // Keep super_admins table in sync
        if (newRole === 'super_admin' && targetRole !== 'super_admin') {
          await adminClient.from('super_admins').insert([
            { id: user_id, name: (data.user.email as string) ?? user_id },
          ])
        }
        if (targetRole === 'super_admin' && newRole && newRole !== 'super_admin') {
          await adminClient.from('super_admins').delete().eq('id', user_id)
        }

        return respond(req, { success: true, data: { user: data.user } })
      }

      case 'delete_user': {
        const { user_id, business_id } = body as DeleteUserPayload

        if (!user_id) {
          return respond(req, { success: false, error: 'Missing required field: user_id' }, 400)
        }

        // Look up target
        const { data: targetUser, error: lookupError } = await adminClient.auth.admin.getUserById(user_id)
        if (lookupError || !targetUser?.user) {
          return respond(req, { success: false, error: lookupError?.message ?? 'User not found' }, 404)
        }
        const targetRole = (targetUser.user.app_metadata?.role as string) ?? null

        // Only super_admin can delete super_admins or business_admins
        if ((targetRole === 'super_admin' || targetRole === 'business_admin') && callerRole !== 'super_admin') {
          return respond(req, { success: false, error: 'Forbidden' }, 403)
        }

        if (callerRole === 'business_admin') {
          if (!callerBusinessId) {
            return respond(req, { success: false, error: 'Caller has no business_id in metadata' }, 403)
          }
          const { data: staffEntry, error: staffErr } = await adminClient
            .from('business_staff')
            .select('id')
            .eq('user_id', user_id)
            .eq('business_id', callerBusinessId)
            .maybeSingle()

          if (staffErr || !staffEntry) {
            return respond(req, { success: false, error: 'User not found in your business staff' }, 403)
          }
          // Also ensure business_id matches if provided
          if (business_id && business_id !== callerBusinessId) {
            return respond(req, { success: false, error: 'Cannot delete users from another business' }, 403)
          }
        }

        // Clean up business_staff rows for this user
        await adminClient.from('business_staff').delete().eq('user_id', user_id)

        const { error } = await adminClient.auth.admin.deleteUser(user_id)
        if (error) {
          return respond(req, { success: false, error: error.message }, 400)
        }

        // Clean up super_admins row if applicable
        if (targetRole === 'super_admin') {
          await adminClient.from('super_admins').delete().eq('id', user_id)
        }

        return respond(req, { success: true })
      }

      default: {
        return respond(req, { success: false, error: `Unknown action: ${body.action}` }, 400)
      }
    }
  } catch (err) {
    console.error('admin-super edge function error:', err)
    return respond(req, { success: false, error: 'Internal server error' }, 500)
  }
})