import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { TEMPLATES, getTemplate } from '../../templates/registry'

const DEFAULT_COLORS = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#e94560',
  background: '#ffffff',
  text: '#1a1a2e',
}

export default function AppearancePage() {
  const { businessId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [colors, setColors] = useState({ ...DEFAULT_COLORS })

  useEffect(() => {
    if (businessId) fetchAppearance()
  }, [businessId])

  async function fetchAppearance() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('businesses')
        .select('template_id, template_colors')
        .eq('id', businessId)
        .single()

      if (fetchErr) throw fetchErr

      if (data) {
        setSelectedTemplate(data.template_id || 'classic')
        if (data.template_colors) {
          try {
            const parsed = typeof data.template_colors === 'string' ? JSON.parse(data.template_colors) : data.template_colors
            setColors({ ...DEFAULT_COLORS, ...parsed })
          } catch {
            // keep defaults
          }
        }
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar apariencia')
    } finally {
      setLoading(false)
    }
  }

  function handleColorChange(key, value) {
    setColors((prev) => ({ ...prev, [key]: value }))
    if (success) setSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateErr } = await supabase
        .from('businesses')
        .update({
          template_id: selectedTemplate,
          template_colors: colors,
        })
        .eq('id', businessId)

      if (updateErr) throw updateErr

      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err?.message || 'Error al guardar apariencia')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando apariencia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Apariencia</h1>
        <p className="mt-1 text-sm text-gray-500">Personaliza la apariencia de la página pública de tu negocio</p>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Apariencia guardada exitosamente.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Template selection */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Plantilla</h2>
        <p className="text-sm text-gray-500 mb-4">Selecciona el diseño base para tu página</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(TEMPLATES).map(([key, tpl]) => {
            const isSelected = selectedTemplate === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTemplate(key)}
                className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${colors.primary}22, ${colors.accent}22)`,
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {tpl.name.charAt(0)}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{tpl.description}</p>

                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Colors */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Colores</h2>
        <p className="text-sm text-gray-500 mb-4">Personaliza la paleta de colores de tu página</p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ColorPicker
            label="Color primario"
            value={colors.primary}
            onChange={(v) => handleColorChange('primary', v)}
          />
          <ColorPicker
            label="Color secundario"
            value={colors.secondary}
            onChange={(v) => handleColorChange('secondary', v)}
          />
          <ColorPicker
            label="Color de acento"
            value={colors.accent}
            onChange={(v) => handleColorChange('accent', v)}
          />
          <ColorPicker
            label="Color de fondo"
            value={colors.background}
            onChange={(v) => handleColorChange('background', v)}
          />
          <ColorPicker
            label="Color de texto"
            value={colors.text}
            onChange={(v) => handleColorChange('text', v)}
          />
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Vista previa</h2>
        <p className="text-sm text-gray-500 mb-4">Así se verán los colores en tu página</p>

        <div
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: colors.background, borderColor: `${colors.text}22` }}
        >
          {/* Header preview */}
          <div className="px-6 py-4" style={{ backgroundColor: colors.primary }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: colors.accent, color: '#ffffff' }}
                >
                  B
                </div>
                <span className="text-lg font-bold" style={{ color: '#ffffff' }}>BarberShifts</span>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: `${colors.accent}cc` }} />
                <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: `${colors.background}22` }} />
              </div>
            </div>
          </div>

          {/* Hero preview */}
          <div className="px-6 py-8 text-center">
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
              Tu estilo, nuestro compromiso
            </h2>
            <p className="mt-2" style={{ color: `${colors.text}99` }}>
              Reserva tu cita con los mejores barberos
            </p>
            <div
              className="mx-auto mt-4 flex h-10 w-40 items-center justify-center rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: colors.accent }}
            >
              Reservar ahora
            </div>
          </div>

          {/* Cards preview */}
          <div className="grid grid-cols-3 gap-4 px-6 pb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: `${colors.secondary}11`,
                  border: `1px solid ${colors.secondary}22`,
                }}
              >
                <div
                  className="mx-auto mb-2 h-12 w-12 rounded-full"
                  style={{ backgroundColor: `${colors.accent}33` }}
                />
                <div className="h-3 w-3/4 rounded mx-auto" style={{ backgroundColor: `${colors.text}33` }} />
                <div className="mt-1 h-3 w-1/2 rounded mx-auto" style={{ backgroundColor: `${colors.text}22` }} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} size="lg">
          Guardar Apariencia
        </Button>
      </div>
    </div>
  )
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-gray-300 p-0.5"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          placeholder="#000000"
        />
        <div
          className="h-8 w-8 shrink-0 rounded-full border border-gray-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}
