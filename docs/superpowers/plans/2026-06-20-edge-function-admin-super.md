# Edge Function `admin-super` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `admin-client.js` (que expone la service_role key en el bundle) por una Edge Function serverless de Supabase.

**Architecture:** Edge Function en Deno que recibe requests autenticados del Super Admin y ejecuta operaciones Admin Auth API con la service_role key como secreto de Supabase. El frontend cambia de `adminClient.auth.admin.createUser()` a `fetch()` contra la Edge Function.

**Tech Stack:** Deno (Supabase Edge Functions), TypeScript, Supabase CLI, React (frontend, sin cambios de stack)

---

### Task 1: Preparar estructura de Edge Functions

**Files:**
- Create: `supabase/functions/admin-super/index.ts`
- Create: `supabase/functions/admin-super/.env.example`
- Modify: `supabase/config.toml` (si existe, crear si no)

- [ ] **Step 1: Crear directorio de la función**

```bash
mkdir -p supabase/functions/admin-super
```

Run from `C:\Users\ASUS\Desktop\Proyectos\negocios`

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-super/
git commit -m "chore: add admin-super edge function skeleton"
```

---

### Task 2: Crear la Edge Function

**Files:**
- Create: `supabase/functions/admin-super/index.ts`

- [ ] **Step 1: Escribir la Edge Function**

```typescript
// supabase/functions/admin-super/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateUserPayload {
  email: string
  password: string
  role: string
  business_id?: string
}

interface UpdateUserPayload {
  user_id: string
  app_metadata: Record<string, unknown>
}

type ActionPayload =
  | { action: 'create_user'; ...CreateUserPayload }
  | { action: 'update_user'; ...UpdateUserPayload }

serve(async (req) => {
  try {
    // 1. Validar método y content-type
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Obtener token de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')

    // 3. Crear cliente Supabase con el token del usuario (NO service_role aún)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabase = createClient(supabaseUrl, token)

    // 4. Verificar que el usuario autenticado es super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    if (user.app_metadata?.role !== 'super_admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Parsear body
    const body = await req.json()
    const { action } = body

    // 6. Crear admin client con service_role key (secreta)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 7. Ejecutar acción
    switch (action) {
      case 'create_user': {
        const { email, password, role, business_id } = body as CreateUserPayload
        if (!email || !password) {
          return new Response(JSON.stringify({ success: false, error: 'email y password son obligatorios' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          })
        }
        const { data: authUser, error: ae } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role, business_id: business_id ?? null },
        })
        if (ae) throw ae
        return new Response(JSON.stringify({ success: true, data: { user_id: authUser.user.id } }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }

      case 'update_user': {
        const { user_id, app_metadata } = body as UpdateUserPayload
        if (!user_id || !app_metadata) {
          return new Response(JSON.stringify({ success: false, error: 'user_id y app_metadata son obligatorios' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          })
        }
        const { error: ue } = await adminClient.auth.admin.updateUserById(user_id, { app_metadata })
        if (ue) throw ue
        return new Response(JSON.stringify({ success: true, data: { user_id } }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-super/index.ts
git commit -m "feat: add admin-super edge function with create/update user"
```

---

### Task 3: Eliminar `admin-client.js` del frontend

**Files:**
- Delete: `src/lib/admin-client.js`
- Modify: `src/pages/admin/SuperDashboard.jsx`

- [ ] **Step 1: Eliminar el archivo admin-client.js**

```bash
rm src/lib/admin-client.js
```

Run from: `C:\Users\ASUS\Desktop\Proyectos\negocios\frontend`

- [ ] **Step 2: Modificar SuperDashboard.jsx**

Cambiar el import y las llamadas para usar `fetch()` a la Edge Function.

**Import cambia de:**
```jsx
import { adminClient } from '../../lib/admin-client'
```

**A (agregar al inicio del componente, junto con los otros imports de hooks):**
```jsx
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
```

Nota: `useAuth` ya está importado si se usa en el componente. Verificar. En `SuperDashboard.jsx` actualmente NO usa `useAuth`. Hay que agregarlo.

**Agregar al inicio del componente (después de los useState):**
```jsx
const { session } = useAuth()
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
```

**Reemplazar el bloque dentro de `handleCreateSubmit` (desde `try {` hasta donde se usa adminClient):**

Antes (líneas 157-184 aprox):
```jsx
    try {
      if (!adminClient) throw new Error('VITE_SUPABASE_SERVICE_KEY no está configurada')

      // 1. Crear usuario auth
      const { data: authUser, error: ae } = await adminClient.auth.admin.createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        email_confirm: true,
        app_metadata: { role: ROLES.BUSINESS_ADMIN },
      })
      if (ae) throw new Error(`Error al crear usuario: ${ae.message}`)

      // 2. Crear negocio
      const { data: biz, error: be } = await supabase.from('businesses').insert([{
        name: createForm.name.trim(), slug: createForm.slug.trim(), email: createForm.email.trim(),
        phone: createForm.phone.trim() || null, address: createForm.address.trim() || null,
        plan: createForm.plan, template_id: createForm.template_id, status: BUSINESS_STATUS.ACTIVE,
      }]).select('id').single()
      if (be) throw new Error(`Error al crear negocio: ${be.message}`)

      // 3. Asignar business_id al auth user y crear staff
      const [sr] = await Promise.all([
        adminClient.auth.admin.updateUserById(authUser.user.id, {
          app_metadata: { role: ROLES.BUSINESS_ADMIN, business_id: biz.id },
        }),
        supabase.from('business_staff').insert([
          { user_id: authUser.user.id, business_id: biz.id, role: 'business_admin' },
        ]),
      ])
      if (sr.error) throw new Error(`Error al asignar admin: ${sr.error.message}`)
      ...
```

Después:
```jsx
    try {
      if (!session?.access_token) throw new Error('No hay sesión activa')

      // 1. Crear usuario auth via Edge Function
      const efUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-super`
      const efRes = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          email: createForm.email.trim(),
          password: createForm.password,
          role: ROLES.BUSINESS_ADMIN,
        }),
      })
      const efData = await efRes.json()
      if (!efData.success) throw new Error(`Error al crear usuario: ${efData.error}`)
      const authUserId = efData.data.user_id

      // 2. Crear negocio
      const { data: biz, error: be } = await supabase.from('businesses').insert([{
        name: createForm.name.trim(), slug: createForm.slug.trim(), email: createForm.email.trim(),
        phone: createForm.phone.trim() || null, address: createForm.address.trim() || null,
        plan: createForm.plan, template_id: createForm.template_id, status: BUSINESS_STATUS.ACTIVE,
      }]).select('id').single()
      if (be) throw new Error(`Error al crear negocio: ${be.message}`)

      // 3. Asignar business_id al auth user via Edge Function
      const efRes2 = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_user',
          user_id: authUserId,
          app_metadata: { role: ROLES.BUSINESS_ADMIN, business_id: biz.id },
        }),
      })
      const efData2 = await efRes2.json()
      if (!efData2.success) throw new Error(`Error al asignar admin: ${efData2.error}`)

      // 4. Crear staff
      const { error: se } = await supabase.from('business_staff').insert([
        { user_id: authUserId, business_id: biz.id, role: 'business_admin' },
      ])
      if (se) throw new Error(`Error al asignar staff: ${se.message}`)

      setShowCreate(false)
      setCreateForm({ ...INITIAL_CREATE })
      setCreateErrors({})
      setSlugManual(false)
      await fetchAll()
    } catch (err) { setFormError(err.message || 'Error al crear') }
    finally { setActionLoading(false) }
```

- [ ] **Step 3: Verificar que el build funciona**

```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios\frontend
npm run build
```

Expected: Build exitoso sin errores.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: replace adminClient with Edge Function fetch calls"
```

---

### Task 4: Configurar Supabase CLI y secrets

**Nota:** Esta tarea la ejecuta el usuario, no un agente automatizado (requiere login interactivo).

- [ ] **Step 1: Login a Supabase CLI**

```bash
supabase login
```
Sigue las instrucciones en el navegador para obtener el token.

- [ ] **Step 2: Link del proyecto local con Supabase**

```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
supabase link --project-ref mrktwxjlltqqxkvktkku
```

Esto crea `supabase/config.toml` con la referencia del proyecto.

- [ ] **Step 3: Configurar el secreto de service_role key**

```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key_del_dashboard>
```

La key está en: Supabase Dashboard → Project Settings → API → service_role key.

- [ ] **Step 4: Deploy de la Edge Function**

```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
supabase functions deploy admin-super --project-ref mrktwxjlltqqxkvktkku
```

- [ ] **Step 5: Verificar que la función responde**

```bash
curl -X POST https://mrktwxjlltqqxkvktkku.supabase.co/functions/v1/admin-super \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create_user"}' 
```

Expected: `{"success":false,"error":"Invalid token"}` (porque el anon key no es un token de sesión válido)

---

### Task 5: Push a GitHub y deploy en Render

- [ ] **Step 1: Push a GitHub**

```bash
cd C:\Users\ASUS\Desktop\Proyectos\negocios
git push origin main
```

- [ ] **Step 2: Render hace auto-deploy**

No requiere acción. Render detecta el push a `main` y redeployea automáticamente.

---

### Task 6: Verificación final

- [ ] **Step 1: Abrir la app en Render**
  - Navegar a la URL de Render
  - Ir a `/admin` e iniciar sesión como super_admin
  - Ir a `/admin/dashboard`
  - Crear una nueva barbería
  - Verificar que se crea correctamente (usuario auth + negocio + staff)

- [ ] **Step 2: Verificar que no hay service_role key en el bundle**
  - Abrir DevTools (F12) → Network
  - Buscar cualquier JS file
  - Ctrl+Shift+F y buscar "service_role" o "SERVICE_KEY" → debe dar 0 resultados
