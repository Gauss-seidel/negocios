import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { DAYS_OF_WEEK } from '../../lib/constants'

const DEFAULT_SLOT_DURATION = 30

function createEmptyDays() {
  const days = {}
  DAYS_OF_WEEK.forEach((d) => {
    days[d.value] = {
      day_of_week: d.value,
      is_closed: true,
      open_time: '09:00',
      close_time: '18:00',
      slot_duration: DEFAULT_SLOT_DURATION,
    }
  })
  return days
}

export default function HoursPage() {
  const { businessId } = useAuth()
  const { currentBranch } = useBranch()
  const [days, setDays] = useState(createEmptyDays())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!currentBranch?.id) return
    if (businessId) fetchHours()
  }, [businessId, currentBranch?.id])

  async function fetchHours() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId)
        .eq('branch_id', currentBranch.id)

      if (fetchErr) throw fetchErr

      if (data && data.length > 0) {
        const merged = { ...createEmptyDays() }
        data.forEach((h) => {
          if (merged[h.day_of_week]) {
            merged[h.day_of_week] = {
              day_of_week: h.day_of_week,
              is_closed: h.is_closed ?? false,
              open_time: h.open_time || '09:00',
              close_time: h.close_time || '18:00',
              slot_duration: h.slot_duration || DEFAULT_SLOT_DURATION,
            }
          }
        })
        setDays(merged)
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar horarios')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle(dayValue) {
    setDays((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], is_closed: !prev[dayValue].is_closed },
    }))
    setSaveSuccess(false)
  }

  function handleChange(dayValue, field, value) {
    setDays((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value },
    }))
    setSaveSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      // Validate open < close for open days
      for (const day of Object.values(days)) {
        if (!day.is_closed && day.open_time && day.close_time) {
          if (day.open_time >= day.close_time) {
            setError(`El horario de ${getDayName(day.day_of_week)} tiene hora de apertura mayor o igual a la de cierre`)
            setSaving(false)
            return
          }
        }
      }

      // Delete existing and re-insert
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

      const { error: insertErr } = await supabase.from('business_hours').insert(records)
      if (insertErr) throw insertErr

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err?.message || 'Error al guardar horarios')
    } finally {
      setSaving(false)
    }
  }

  function getDayName(value) {
    const day = DAYS_OF_WEEK.find((d) => d.value === value)
    return day ? day.label : `Día ${value}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando horarios...</p>
        </div>
      </div>
    )
  }

  if (error && !Object.values(days).some((d) => d.day_of_week)) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Error al cargar</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchHours}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Horarios</h1>
        <p className="mt-1 text-sm text-gray-500">Configura los horarios de atención de tu negocio</p>
      </div>

      {/* Save feedback */}
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Horarios guardados exitosamente.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Days grid */}
      <div className="space-y-3">
        {Object.values(days)
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((day) => (
            <Card key={day.day_of_week} className={day.is_closed ? 'opacity-60' : ''}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                {/* Day name + toggle */}
                <div className="flex items-center gap-3 sm:w-40">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={!day.is_closed}
                      onChange={() => handleToggle(day.day_of_week)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--color-accent)] peer-checked:after:translate-x-full" />
                  </label>
                  <span className="min-w-20 text-sm font-medium text-gray-900">
                    {getDayName(day.day_of_week)}
                  </span>
                </div>

                {!day.is_closed && (
                  <>
                    {/* Open time */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Desde</label>
                      <input
                        type="time"
                        value={day.open_time}
                        onChange={(e) => handleChange(day.day_of_week, 'open_time', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    {/* Close time */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Hasta</label>
                      <input
                        type="time"
                        value={day.close_time}
                        onChange={(e) => handleChange(day.day_of_week, 'close_time', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    {/* Slot duration */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Duración</label>
                      <select
                        value={day.slot_duration}
                        onChange={(e) => handleChange(day.day_of_week, 'slot_duration', Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                        <option value={120}>120 min</option>
                      </select>
                    </div>
                  </>
                )}

                {day.is_closed && (
                  <span className="text-sm text-gray-400">Cerrado</span>
                )}
              </div>
            </Card>
          ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} size="lg">
          Guardar Horarios
        </Button>
      </div>
    </div>
  )
}
