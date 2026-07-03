import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function respond(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

interface CreateUserPayload {
  action: 'create_user'
  email: string
  password: string
  role: string
  business_id?: string
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

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return respond({ success: false, error: 'Method not allowed' }, 405)
    }

    // Validate Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return respond({ success: false, error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')

    // Validate Content-Type
    const contentType = req.headers.get('Content-Type')
    if (!contentType || !contentType.includes('application/json')) {
      return respond({ success: false, error: 'Content-Type must be application/json' }, 400)
    }

    // Parse body
    let body: Payload
    try {
      body = await req.json()
    } catch {
      return respond({ success: false, error: 'Invalid JSON body' }, 400)
    }

    if (!body.action) {
      return respond({ success: false, error: 'Missing action field' }, 400)
    }

    // Build Supabase client for the caller's session token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    // Authenticate the caller
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return respond({ success: false, error: 'Invalid or expired session token' }, 401)
    }

    // Verify caller role
    const callerRole = user.app_metadata?.role
    const callerBusinessId = user.app_metadata?.business_id

    const allowedRoles = ['super_admin', 'business_admin']

    if (!allowedRoles.includes(callerRole)) {
      return respond({ success: false, error: 'Forbidden: requires super_admin or business_admin role' }, 403)
    }

    // business_admin can only act on users belonging to their own business
    if (callerRole === 'business_admin') {
      if (!callerBusinessId) {
        return respond({ success: false, error: 'Caller has no business_id in metadata' }, 403)
      }

      if (body.action === 'create_user') {
        const p = body as CreateUserPayload
        if (p.business_id && p.business_id !== callerBusinessId) {
          return respond({ success: false, error: 'Cannot create users for another business' }, 403)
        }
      }
    }

    // Build admin client with service_role key
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Dispatch actions
    switch (body.action) {
      case 'create_user': {
        const { email, password, role, business_id } = body as CreateUserPayload

        if (!email || !password || !role) {
          return respond({ success: false, error: 'Missing required fields: email, password, role' }, 400)
        }

        const app_metadata: Record<string, string> = { role }
        if (business_id) {
          app_metadata.business_id = business_id
        }

        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata,
        })

        if (error) {
          return respond({ success: false, error: error.message }, 400)
        }

        return respond({ success: true, data: { user: data.user } })
      }

      case 'update_user': {
        const { user_id, app_metadata } = body as UpdateUserPayload

        if (!user_id || !app_metadata) {
          return respond({ success: false, error: 'Missing required fields: user_id, app_metadata' }, 400)
        }

        // Validate the target user exists first
        const { data: targetUser, error: lookupError } = await adminClient.auth.admin.getUserById(user_id)

        if (lookupError || !targetUser?.user) {
          return respond({ success: false, error: lookupError?.message ?? 'User not found' }, 404)
        }

        const { data, error } = await adminClient.auth.admin.updateUserById(
          user_id,
          { app_metadata },
        )

        if (error) {
          return respond({ success: false, error: error.message }, 400)
        }

        return respond({ success: true, data: { user: data.user } })
      }

      case 'delete_user': {
        const { user_id, business_id } = body as DeleteUserPayload

        if (!user_id) {
          return respond({ success: false, error: 'Missing required field: user_id' }, 400)
        }

        // If caller is business_admin, verify the user belongs to their business
        if (callerRole === 'business_admin') {
          if (!callerBusinessId) {
            return respond({ success: false, error: 'Caller has no business_id in metadata' }, 403)
          }

          const { data: staffEntry, error: staffErr } = await adminClient
            .from('business_staff')
            .select('id')
            .eq('user_id', user_id)
            .eq('business_id', callerBusinessId)
            .maybeSingle()

          if (staffErr || !staffEntry) {
            return respond({ success: false, error: 'User not found in your business staff' }, 403)
          }
        }

        const { error } = await adminClient.auth.admin.deleteUser(user_id)

        if (error) {
          return respond({ success: false, error: error.message }, 400)
        }

        return respond({ success: true })
      }

      default: {
        return respond({ success: false, error: `Unknown action: ${body.action}` }, 400)
      }
    }
  } catch (err) {
    console.error('admin-super edge function error:', err)
    return respond({ success: false, error: 'Internal server error' }, 500)
  }
})
