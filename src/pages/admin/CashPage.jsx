import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import { usePlan } from '../../hooks/usePlan'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { CASH_MOVEMENT_TYPES } from '../../lib/constants'
import { fmtCurrencyWithCents as formatCurrency } from '../../utils/format'

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  } catch { return '—' }
}

const MOVEMENT_LABELS = {
  [CASH_MOVEMENT_TYPES.INCOME]: 'Ingreso',
  [CASH_MOVEMENT_TYPES.EXPENSE]: 'Gasto',
  [CASH_MOVEMENT_TYPES.WITHDRAWAL]: 'Retiro',
}

const MOVEMENT_COLORS = {
  [CASH_MOVEMENT_TYPES.INCOME]: 'text-emerald-600 bg-emerald-50',
  [CASH_MOVEMENT_TYPES.EXPENSE]: 'text-red-600 bg-red-50',
  [CASH_MOVEMENT_TYPES.WITHDRAWAL]: 'text-amber-600 bg-amber-50',
}

const MOVEMENT_ICONS = {
  [CASH_MOVEMENT_TYPES.INCOME]: 'M12 4v16m8-8H4',
  [CASH_MOVEMENT_TYPES.EXPENSE]: 'M20 12H4',
  [CASH_MOVEMENT_TYPES.WITHDRAWAL]: 'M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m4 4v6m-3 0h6',
}

export default function CashPage() {
  const { businessId } = useAuth()
  const { currentBranch, loading: branchLoading } = useBranch()
  const { isProfessional, planName, loading: planLoading } = usePlan()
  const [register, setRegister] = useState(null)
  const [movements, setMovements] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  const [showMovementModal, setShowMovementModal] = useState(false)
  const [movementForm, setMovementForm] = useState({
    type: CASH_MOVEMENT_TYPES.INCOME,
    description: '',
    amount: '',
    reference: '',
  })
  const [movementError, setMovementError] = useState(null)
  const [movementSaving, setMovementSaving] = useState(false)

  const [openAmount, setOpenAmount] = useState('')
  const [openError, setOpenError] = useState(null)

  useEffect(() => {
    if (businessId && currentBranch?.id) fetchCashData()
  }, [businessId, currentBranch?.id])

  async function fetchCashData() {
    setLoading(true)
    setError(null)

    try {
      const [registerRes, movementsRes] = await Promise.allSettled([
        supabase
          .from('cash_register')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_open', true)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('cash_movements')
          .select('*')
          .eq('branch_id', currentBranch.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (registerRes.status === 'fulfilled') {
        setRegister(registerRes.value.data || null)
      }
      if (movementsRes.status === 'fulfilled') {
        setMovements(movementsRes.value.data || [])
      }

      // Calculate balance
      const movs = movementsRes.status === 'fulfilled' ? movementsRes.value.data || [] : []
      const calcBalance = movs.reduce((sum, m) => {
        if (m.type === CASH_MOVEMENT_TYPES.INCOME) return sum + Number(m.amount)
        return sum - Number(m.amount)
      }, 0)
      setBalance(calcBalance)
    } catch (err) {
      setError(err?.message || 'Error al cargar datos de caja')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenRegister() {
    if (!openAmount || Number(openAmount) < 0) {
      setOpenError('Ingresa un monto inicial válido')
      return
    }

    setActionLoading(true)
    setOpenError(null)

    try {
      const { error: insertErr } = await supabase.from('cash_register').insert([
        {
          business_id: businessId,
          initial_amount: Number(openAmount),
          is_open: true,
          opened_at: new Date().toISOString(),
        },
      ])
      if (insertErr) throw insertErr

      setOpenAmount('')
      setSuccessMessage('Caja abierta exitosamente')
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchCashData()
    } catch (err) {
      setOpenError(err.message || 'Error al abrir caja')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCloseRegister() {
    if (!register) return

    setActionLoading(true)
    setError(null)

    try {
      const { error: updateErr } = await supabase
        .from('cash_register')
        .update({
          is_open: false,
          final_amount: balance,
          closed_at: new Date().toISOString(),
        })
        .eq('id', register.id)
      if (updateErr) throw updateErr

      setRegister(null)
      setSuccessMessage('Caja cerrada exitosamente')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || 'Error al cerrar caja')
    } finally {
      setActionLoading(false)
    }
  }

  function openAddMovement(type) {
    setMovementForm({
      type,
      description: '',
      amount: '',
      reference: '',
    })
    setMovementError(null)
    setShowMovementModal(true)
  }

  async function handleAddMovement(e) {
    e.preventDefault()
    if (!movementForm.description.trim()) {
      setMovementError('La descripción es obligatoria')
      return
    }
    if (!movementForm.amount || Number(movementForm.amount) <= 0) {
      setMovementError('El monto debe ser mayor a 0')
      return
    }

    setMovementSaving(true)
    setMovementError(null)

    try {
      const { error: insertErr } = await supabase.from('cash_movements').insert([
        {
          type: movementForm.type,
          description: movementForm.description.trim(),
          amount: Number(movementForm.amount),
          branch_id: currentBranch.id,
          register_id: register?.id || null,
        },
      ])
      if (insertErr) throw insertErr

      setShowMovementModal(false)
      setSuccessMessage('Movimiento registrado')
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchCashData()
    } catch (err) {
      setMovementError(err.message || 'Error al registrar movimiento')
    } finally {
      setMovementSaving(false)
    }
  }

  if (loading || planLoading || branchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando caja...</p>
        </div>
      </div>
    )
  }

  if (!currentBranch) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-gray-500">Selecciona una sucursal para ver la caja</p>
      </div>
    )
  }

  if (!isProfessional) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Caja</h1>
          <p className="mt-1 text-sm text-gray-500">Control de ingresos y gastos</p>
        </div>
        <UpgradePrompt feature="El modulo de Caja" requiredPlan="Profesional" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Caja</h1>
        <p className="mt-1 text-sm text-gray-500">Control de ingresos y gastos del día</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Register status */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Estado de caja</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                register ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className={`mr-1.5 h-2 w-2 rounded-full ${
                  register ? 'bg-emerald-500' : 'bg-gray-400'
                }`} />
                {register ? 'Abierta' : 'Cerrada'}
              </span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</span>
            </div>
          </div>

          {register ? (
            /* ── Caja abierta: botones con wrap ── */
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => openAddMovement(CASH_MOVEMENT_TYPES.INCOME)}>
                + Ingreso
              </Button>
              <Button variant="secondary" onClick={() => openAddMovement(CASH_MOVEMENT_TYPES.EXPENSE)}>
                - Gasto
              </Button>
              <Button variant="danger" onClick={handleCloseRegister} loading={actionLoading}>
                Cerrar Caja
              </Button>
            </div>
          ) : (
            /* ── Caja cerrada: input + botón con wrap ── */
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={openAmount}
                onChange={(e) => { setOpenAmount(e.target.value); setOpenError(null) }}
                placeholder="Monto inicial"
                className="w-full sm:w-40"
              />
              <Button onClick={handleOpenRegister} loading={actionLoading}>
                Abrir Caja
              </Button>
            </div>
          )}
        </div>
        {openError && <p className="mt-2 text-sm text-red-600">{openError}</p>}
      </Card>

      {/* Movements */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Movimientos</h2>
            <p className="text-sm text-gray-500">Últimos 50 movimientos registrados</p>
          </div>
        </div>

        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">Sin movimientos</h3>
            <p className="mt-1 text-sm text-gray-500">Aún no hay movimientos registrados en la caja.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${MOVEMENT_COLORS[mov.type] || 'bg-gray-100 text-gray-500'}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={MOVEMENT_ICONS[mov.type] || 'M12 4v16m8-8H4'} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{mov.description}</p>
                    <p className="text-xs text-gray-400">
                      {MOVEMENT_LABELS[mov.type] || mov.type}
                      {mov.reference ? ` · Ref: ${mov.reference}` : ''}
                      {' · '}{formatDateTime(mov.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${
                  mov.type === CASH_MOVEMENT_TYPES.INCOME ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {mov.type === CASH_MOVEMENT_TYPES.INCOME ? '+' : '-'}{formatCurrency(mov.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add movement modal */}
      <Modal
        open={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title={movementForm.type === CASH_MOVEMENT_TYPES.INCOME ? 'Registrar Ingreso' : 'Registrar Gasto'}
        size="sm"
      >
        {movementError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {movementError}
          </div>
        )}

        <form onSubmit={handleAddMovement} className="space-y-4">
          <Input
            label="Descripción"
            name="description"
            value={movementForm.description}
            onChange={(e) => setMovementForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Ej: Corte de cabello - Juan"
          />

          <Input
            label="Monto (Gs)"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={movementForm.amount}
            onChange={(e) => setMovementForm((prev) => ({ ...prev, amount: e.target.value }))}
          />

          <Input
            label="Referencia (opcional)"
            name="reference"
            value={movementForm.reference}
            onChange={(e) => setMovementForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Nº de ticket, factura, etc."
          />

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowMovementModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={movementSaving}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
