# Sucursales (Branches) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar múltiples sucursales por negocio con selector en admin, filtrado de datos por sucursal, gestión desde super admin y display en páginas públicas.

**Architecture:** Nueva tabla `branches` en Supabase + `BranchContext` para estado global + modificaciones en AdminLayout para selector + filtrado por `branch_id` en todas las queries de data pages. Servicios y clientes se mantienen business-wide.

**Tech Stack:** React 19, Supabase (PostgreSQL), Context API

---

## Files Map

### Nuevos archivos:
- `supabase/migrations/20260626_create_branches.sql` — SQL migration script
- `src/contexts/BranchContext.jsx` — Contexto global para sucursal activa
- `src/pages/admin/SucursalesPage.jsx` — CRUD sucursales desde admin negocio
- `src/pages/admin/SuperBranchesPage.jsx` — Gestión sucursales desde super admin
- `src/components/ui/BranchSelector.jsx` — Dropdown selector de sucursal

### Archivos a modificar:
- `src/App.jsx` — agregar ruta `/sucursales` (admin negocio) y rutas super admin
- `src/layouts/AdminLayout.jsx` — agregar BranchSelector en sidebar
- `src/pages/admin/SuperDashboard.jsx` — agregar campos de sucursal al crear negocio + columna "Ver sucursales"
- `src/pages/admin/BarbersPage.jsx` — filtrar por branch, asignar branch al crear
- `src/pages/admin/AppointmentsPage.jsx` — filtrar por branch
- `src/pages/admin/CashPage.jsx` — filtrar por branch
- `src/pages/admin/InventoryPage.jsx` — filtrar por branch
- `src/pages/admin/HoursPage.jsx` — agregar branch_id a los registros
- `src/pages/admin/BusinessDashboard.jsx` — filtrar métricas por branch
- `src/pages/admin/ConfigPage.jsx` — mostrar sucursal actual
- `src/pages/barberia/BarberiaPage.jsx` — mostrar lista de sucursales activas
- `src/pages/barberia/BookingPage.jsx` — selector de sucursal al inicio

---

### Task 1: SQL Migration Script

**Files:**
- Create: `supabase/migrations/20260626_create_branches.sql`

Esta migración se ejecuta directo en Supabase Dashboard > SQL Editor.

- [ ] **Step 1: Crear el script de migración**

```sql
-- 1. Crear tabla branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  google_maps_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, slug)
);

-- 2. Crear sucursal "Principal" para cada negocio existente
INSERT INTO branches (business_id, name, slug, address, phone)
SELECT
  id,
  COALESCE(name, 'Principal'),
  'principal',
  address,
  phone
FROM businesses;

-- 3. Agregar branch_id a tablas existentes
ALTER TABLE barbers ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE appointments ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE cash_movements ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE inventory_items ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE business_hours ADD COLUMN branch_id UUID REFERENCES branches(id);

-- 4. Backfill branch_id con la sucursal "Principal" de cada negocio
UPDATE barbers b SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = b.business_id LIMIT 1
);
UPDATE appointments a SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = a.business_id LIMIT 1
);
UPDATE cash_movements cm SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = cm.business_id LIMIT 1
);
UPDATE inventory_items ii SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = ii.business_id LIMIT 1
);
UPDATE business_hours bh SET branch_id = (
  SELECT br.id FROM branches br WHERE br.business_id = bh.business_id LIMIT 1
);

-- 5. Hacer NOT NULL después del backfill
ALTER TABLE barbers ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE cash_movements ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE inventory_items ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE business_hours ALTER COLUMN branch_id SET NOT NULL;

-- 6. Índices para performance
CREATE INDEX idx_branches_business_id ON branches(business_id);
CREATE INDEX idx_branches_slug ON branches(business_id, slug);
CREATE INDEX idx_barbers_branch_id ON barbers(branch_id);
CREATE INDEX idx_appointments_branch_id ON appointments(branch_id);
CREATE INDEX idx_cash_movements_branch_id ON cash_movements(branch_id);
CREATE INDEX idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX idx_business_hours_branch_id ON business_hours(branch_id);
```

- [ ] **Step 2: Verificar que el script es correcto**

Revisar que los nombres de tablas (`inventory_items`, `cash_movements`, etc.) coinciden con los que existen en Supabase.

---

### Task 2: BranchContext

**Files:**
- Create: `src/contexts/BranchContext.jsx`

- [ ] **Step 1: Crear el contexto**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { businessId } = useAuth()
  const [branches, setBranches] = useState([])
  const [currentBranch, setCurrentBranch] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar sucursales del negocio
  useEffect(() => {
    if (!businessId) {
      setBranches([])
      setCurrentBranch(null)
      setLoading(false)
      return
    }

    const savedId = localStorage.getItem(`branch_${businessId}`)

    supabase
      .from('branches')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setBranches(list)

        // Seleccionar branch: guardada en localStorage, o la primera
        let selected = null
        if (savedId) {
          selected = list.find(b => b.id === savedId)
        }
        if (!selected && list.length > 0) {
          selected = list[0]
        }
        setCurrentBranch(selected)
        setLoading(false)
      })
  }, [businessId])

  const switchBranch = useCallback((branchId) => {
    const found = branches.find(b => b.id === branchId)
    if (found) {
      setCurrentBranch(found)
      localStorage.setItem(`branch_${businessId}`, branchId)
    }
  }, [branches, businessId])

  return (
    <BranchContext.Provider value={{
      branches,
      currentBranch,
      branchCount: branches.length,
      switchBranch,
      loading,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranch debe usarse dentro de un BranchProvider')
  }
  return context
}
```

- [ ] **Step 2: Agregar BranchProvider en App.jsx**

En `src/App.jsx`, importar `BranchProvider` y envolver el contenido dentro de `AuthProvider`:

```jsx
import { BranchProvider } from './contexts/BranchContext'

// Dentro del return:
<BrowserRouter>
  <AuthProvider>
    <BranchProvider>
      <Routes>...</Routes>
    </BranchProvider>
  </AuthProvider>
</BrowserRouter>
```

---

### Task 3: BranchSelector Component

**Files:**
- Create: `src/components/ui/BranchSelector.jsx`

- [ ] **Step 1: Crear el componente**

```jsx
import { useBranch } from '../../contexts/BranchContext'

export default function BranchSelector({ planLimit }) {
  const { branches, currentBranch, switchBranch, branchCount } = useBranch()

  if (branches.length <= 1) return null

  return (
    <div className="relative px-3 py-2">
      <select
        value={currentBranch?.id || ''}
        onChange={(e) => switchBranch(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-0"
      >
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-white/30 text-center">
        {branchCount}/{planLimit} sucursales
      </p>
    </div>
  )
}
```

---

### Task 4: Agregar BranchSelector en AdminLayout

**Files:**
- Modify: `src/layouts/AdminLayout.jsx`
- Modify: `src/pages/admin/PlansPage.jsx` (exponer planLimit)

- [ ] **Step 1: Importar BranchSelector y useBranch en AdminLayout**

```jsx
import BranchSelector from '../components/ui/BranchSelector'
import { useBranch } from '../contexts/BranchContext'
```

- [ ] **Step 2: Agregar el selector en el sidebar**

Dentro del `<nav>` del sidebar, justo después del logo o antes de los items de navegación:

```jsx
<BranchSelector planLimit={3} />
```

Nota: `planLimit` se obtendrá desde `usePlan` o se pasa como prop. Para simplificar, podemos hardcodear momentáneamente y luego conectar cuando `usePlan` tenga el límite disponible en el layout.

---

### Task 5: Modificar SuperDashboard — crear negocio con sucursal

**Files:**
- Modify: `src/pages/admin/SuperDashboard.jsx`

- [ ] **Step 1: Agregar campos de sucursal al form de creación**

En `INITIAL_CREATE`, agregar:
```jsx
const INITIAL_CREATE = {
  name: '', slug: '', email: '', phone: '', address: '',
  plan: 'basic', template_id: 'classic', password: '',
  // Nuevos campos de sucursal
  branch_name: '',
  branch_phone: '',
  branch_address: '',
}
```

- [ ] **Step 2: En el modal de crear, agregar sección "Sucursal inicial"**

Justo después de los campos de negocio:

```jsx
<div>
  <h3 className="text-sm font-semibold text-white/70 mb-3">Sucursal inicial</h3>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <Input label="Nombre de sucursal" name="branch_name" value={createForm.branch_name}
      onChange={handleCreateChange} placeholder="Principal" dark />
    <Input label="Teléfono de sucursal" name="branch_phone" value={createForm.branch_phone}
      onChange={handleCreateChange} placeholder={createForm.phone} dark />
  </div>
  <div className="mt-3">
    <Input label="Dirección de sucursal" name="branch_address" value={createForm.branch_address}
      onChange={handleCreateChange} placeholder={createForm.address} dark />
  </div>
</div>
```

- [ ] **Step 3: Modificar handleCreate para insertar branch**

En la función `handleCreate`, después de crear el business, insertar la branch:

```jsx
// Después de crear el negocio exitosamente:
if (bizData?.id) {
  const { error: branchErr } = await supabase.from('branches').insert({
    business_id: bizData.id,
    name: createForm.branch_name.trim() || 'Principal',
    slug: genSlug(createForm.branch_name.trim() || 'principal'),
    address: createForm.branch_address.trim() || createForm.address.trim(),
    phone: createForm.branch_phone.trim() || createForm.phone.trim(),
  })
  if (branchErr) throw branchErr
}
```

- [ ] **Step 4: Agregar columna "Sucursales" en la tabla de barberías**

En la tabla de negocios, agregar columna que muestra el conteo de sucursales y un botón:

```jsx
// En la tabla, después de la columna de Plan:
<td className="px-6 py-4">
  <span className="text-white/60">N</span>
</td>
<td className="px-6 py-4">
  <button onClick={() => openBranchManager(biz)} 
    className="text-xs text-blue-400 hover:text-blue-300">
    Ver sucursales
  </button>
</td>
```

- [ ] **Step 5: Crear modal/listView de sucursales para super admin**

Agregar `showBranchManager`, `branchManagerTarget` y función `openBranchManager`. Mostrar lista de sucursales con opción de agregar.

---

### Task 6: Página Sucursales (Business Admin)

**Files:**
- Create: `src/pages/admin/SucursalesPage.jsx`
- Modify: `src/App.jsx` — agregar ruta
- Modify: `src/layouts/AdminLayout.jsx` — agregar nav item

- [ ] **Step 1: Crear SucursalesPage.jsx**

Página CRUD de sucursales:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import { usePlan } from '../../hooks/usePlan'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'

function genSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function SucursalesPage() {
  const { businessId } = useAuth()
  const { branches, switchBranch } = useBranch()
  const { limits, isPremium, planName, loading: planLoading } = usePlan()
  const { isMobile } = useResponsiveTable()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', google_maps_url: '' })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const atLimit = list.length >= (limits.max_branches || 999)

  useEffect(() => {
    if (businessId) fetchBranches()
  }, [businessId])

  async function fetchBranches() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .order('name')
      setList(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditTarget(null)
    setForm({ name: '', phone: '', address: '', google_maps_url: '' })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(branch) {
    setEditTarget(branch)
    setForm({
      name: branch.name || '',
      phone: branch.phone || '',
      address: branch.address || '',
      google_maps_url: branch.google_maps_url || '',
    })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Obligatorio'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    setFormErrors(v)
    if (Object.keys(v).length) return

    setActionLoading(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: genSlug(form.name.trim()),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
      }

      if (editTarget) {
        await supabase.from('branches').update(payload).eq('id', editTarget.id)
      } else {
        payload.business_id = businessId
        await supabase.from('branches').insert(payload)
      }

      setShowModal(false)
      await fetchBranches()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggle(branch) {
    setActionLoading(true)
    try {
      await supabase.from('branches').update({ is_active: !branch.is_active }).eq('id', branch.id)
      await fetchBranches()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  /* ─── Loading ─── */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  /* ─── Header ─── */
  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Sucursales</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {list.length} de {limits.max_branches >= 999 ? '∞' : limits.max_branches} sucursales
        </p>
      </div>
      <Button onClick={openCreate} disabled={atLimit || planLoading}>
        {atLimit ? 'Límite alcanzado' : 'Agregar sucursal'}
      </Button>
    </div>
  )

  /* ─── Upgrade prompt ─── */
  const upgradeBlock = atLimit && !isPremium ? (
    <UpgradePrompt
      feature="sucursales"
      plan={planName}
      message="Actualizá tu plan para tener más sucursales"
    />
  ) : null

  /* ─── Empty state ─── */
  if (list.length === 0 && !loading) return (
    <div className="space-y-6">
      {header}
      <Card>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No hay sucursales todavía</p>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {header}
      {upgradeBlock}

      <Card dark={false} padding={false}>
        {isMobile ? (
          <div className="space-y-3 px-4 py-4">
            {list.map(b => (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    b.is_active
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                      : 'border-red-500/20 bg-red-500/10 text-red-600'
                  }`}>
                    {b.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {b.address && <p className="text-sm text-gray-500">{b.address}</p>}
                {b.phone && <p className="text-sm text-gray-500">{b.phone}</p>}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button onClick={() => handleToggle(b)}
                    className={`rounded-lg p-2 transition-all hover:bg-gray-100 ${b.is_active ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      {b.is_active
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      }
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th className="px-6 py-3.5">Nombre</th>
                <th className="px-6 py-3.5">Dirección</th>
                <th className="px-6 py-3.5">Teléfono</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {list.map(b => (
                <tr key={b.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>{b.address || '—'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>{b.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      b.is_active
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                        : 'border-red-500/20 bg-red-500/10 text-red-600'
                    }`}>
                      {b.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleToggle(b)}
                        className={`rounded-lg p-2 transition-all hover:bg-gray-100 ${b.is_active ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          {b.is_active
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          }
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Edit/Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Editar sucursal' : 'Nueva sucursal'} size="md">
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} error={formErrors.name} />
          <Input label="Teléfono" name="phone" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
          <Input label="Dirección" name="address" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} />
          <Input label="Google Maps URL" name="google_maps_url" value={form.google_maps_url} onChange={e => setForm(p => ({...p, google_maps_url: e.target.value}))} />
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>{editTarget ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
```

Incluir:
- Header con contador "X sucursales de Y"
- UpgradePrompt si `atLimit`
- Tabla con columnas: Nombre, Dirección, Teléfono, Estado, Acciones
- Modal de crear/editar con campos: Nombre, Teléfono, Dirección, Google Maps URL
- Toggle activo/inactivo

- [ ] **Step 2: Agregar ruta en App.jsx**

```jsx
import SucursalesPage from './pages/admin/SucursalesPage'

// Dentro del Route de AdminLayout:
<Route path="sucursales" element={<SucursalesPage />} />
```

- [ ] **Step 3: Agregar nav item en AdminLayout**

```jsx
{ path: '/admin/mi-negocio/sucursales', label: 'Sucursales', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
```

---

### Task 7: Modificar BusinessDashboard — filtrar por branch

**Files:**
- Modify: `src/pages/admin/BusinessDashboard.jsx`

- [ ] **Step 1: Importar useBranch y agregar currentBranch a las queries**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

```jsx
const { currentBranch } = useBranch()
```

- [ ] **Step 2: Agregar .eq('branch_id', currentBranch.id) a todas las queries**

Ejemplo:
```jsx
supabase.from('appointments').select(...).eq('business_id', businessId).eq('branch_id', currentBranch.id)
```

Envolver con `if (!currentBranch) return` para evitar queries con branch null.

---

### Task 8: Modificar BarbersPage — filtrar y asignar branch

**Files:**
- Modify: `src/pages/admin/BarbersPage.jsx`

- [ ] **Step 1: Importar useBranch**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

```jsx
const { currentBranch } = useBranch()
```

- [ ] **Step 2: Agregar .eq('branch_id', currentBranch.id) a la query de barberos**

```jsx
.eq('branch_id', currentBranch.id)
```

- [ ] **Step 3: Al crear/editar barbero, incluir branch_id en el payload**

```jsx
const payload = {
  ...,
  branch_id: currentBranch.id,
}
```

---

### Task 9: Modificar AppointmentsPage — filtrar por branch

**Files:**
- Modify: `src/pages/admin/AppointmentsPage.jsx`

- [ ] **Step 1: Importar useBranch**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

- [ ] **Step 2: Agregar `.eq('branch_id', currentBranch.id)` a la query de appointments**

---

### Task 10: Modificar CashPage — filtrar por branch

**Files:**
- Modify: `src/pages/admin/CashPage.jsx`

- [ ] **Step 1: Importar useBranch**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

- [ ] **Step 2: Agregar `.eq('branch_id', currentBranch.id)` a las queries de cash y al insertar movimientos**

---

### Task 11: Modificar InventoryPage — filtrar por branch

**Files:**
- Modify: `src/pages/admin/InventoryPage.jsx`

- [ ] **Step 1: Importar useBranch**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

- [ ] **Step 2: Agregar `.eq('branch_id', currentBranch.id)` a la query de inventario y al crear/editar productos**

---

### Task 12: Modificar HoursPage — asignar branch

**Files:**
- Modify: `src/pages/admin/HoursPage.jsx`

- [ ] **Step 1: Importar useBranch**

```jsx
import { useBranch } from '../../contexts/BranchContext'
```

- [ ] **Step 2: Agregar branch_id al delete e insert de horarios**

```jsx
// En handleSave:
await supabase.from('business_hours').delete()
  .eq('business_id', businessId)
  .eq('branch_id', currentBranch.id)

const records = Object.values(days).map((d) => ({
  business_id: businessId,
  branch_id: currentBranch.id,
  day_of_week: d.day_of_week,
  is_closed: d.is_closed,
  open_time: d.open_time,
  close_time: d.close_time,
  slot_duration: d.slot_duration,
}))
```

También agregar `.eq('branch_id', currentBranch.id)` en `fetchHours`.

---

### Task 13: Modificar BarberiaPage — mostrar sucursales

**Files:**
- Modify: `src/pages/barberia/BarberiaPage.jsx`

- [ ] **Step 1: Cargar sucursales del negocio**

Después de cargar el business, cargar sus sucursales activas:

```jsx
const { data: branches } = await supabase
  .from('branches')
  .select('*')
  .eq('business_id', biz.id)
  .eq('is_active', true)
```

- [ ] **Step 2: Reemplazar la info de dirección/ubicación única por un listado de tarjetas**

En lugar de mostrar una sola dirección, mostrar un grid de tarjetas:

```jsx
{branches.length > 0 ? (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {branches.map(branch => (
      <div key={branch.id} className="rounded-xl border p-4">
        <h4 className="font-semibold">{branch.name}</h4>
        {branch.address && <p className="text-sm text-gray-500">{branch.address}</p>}
        {branch.phone && <p className="text-sm text-gray-500">{branch.phone}</p>}
        <Link to={`/barberia/${slug}/reservar?branch=${branch.slug}`}
          className="mt-3 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white">
          Reservar en esta sucursal
        </Link>
      </div>
    ))}
  </div>
) : (
  <p className="text-gray-500">No hay sucursales disponibles</p>
)}
```

---

### Task 14: Modificar BookingPage — selector de sucursal

**Files:**
- Modify: `src/pages/barberia/BookingPage.jsx`

- [ ] **Step 1: Detectar si el negocio tiene múltiples sucursales**

Al cargar el business, cargar también las sucursales activas.

- [ ] **Step 2: Si hay múltiples sucursales, mostrar selector al inicio**

```jsx
{branches.length > 1 && !selectedBranch && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-3">Elegí tu sucursal</h3>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {branches.map(branch => (
        <button key={branch.id} onClick={() => setSelectedBranch(branch)}
          className="rounded-xl border p-4 text-left hover:border-[var(--color-accent)] transition-all">
          <p className="font-semibold">{branch.name}</p>
          {branch.address && <p className="text-sm text-gray-500">{branch.address}</p>}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Soportar `?branch=` en URL**

```jsx
const params = new URLSearchParams(location.search)
const branchSlug = params.get('branch')
```

Si `branchSlug` existe y coincide con alguna sucursal, seleccionarla automáticamente.

- [ ] **Step 4: Filtrar barberos y horarios por branch seleccionada**

```jsx
// En las queries de barberos y horarios:
.eq('branch_id', selectedBranch.id)
```

---

### Task 15: Build y verificación

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Build exitoso sin errores

- [ ] **Step 2: Verificar rutas**

Run: `npm run dev`
Probar manualmente:
- Super admin: crear negocio con sucursal
- Super admin: ver sucursales de una barbería existente
- Business admin: ver selector en sidebar
- Business admin: crear/editar sucursales
- Business admin: cambiar de sucursal y ver que datos cambian
- Página pública: ver listado de sucursales
- Booking: seleccionar sucursal y reservar
