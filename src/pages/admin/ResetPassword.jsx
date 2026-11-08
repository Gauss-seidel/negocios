import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validToken, setValidToken] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) {
      setChecking(false)
      return
    }
    const timer = setTimeout(() => {
      setValidToken(true)
      setChecking(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setSuccess(true)
      setTimeout(() => navigate('/admin', { replace: true }), 3000)
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const shell = (content) => (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="w-full max-w-md">{content}</div>
    </div>
  )

  if (checking) {
    return shell(
      <div className="flex justify-center py-8" aria-label="Cargando">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '150ms' }} />
          <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (!validToken) {
    return shell(
      <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 12px 32px -24px rgba(31,26,23,.28)' }}>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Enlace inválido</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Este enlace de recuperación expiró o no es válido. Solicitá uno nuevo.
        </p>
        <Link to="/admin" className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold transition hover:opacity-92" style={{ backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)' }}>
          Volver al login
        </Link>
      </div>
    )
  }

  if (success) {
    return shell(
      <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 12px 32px -24px rgba(31,26,23,.28)' }}>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Contraseña actualizada</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Redirigiendo al login…</p>
      </div>
    )
  }

  return shell(
    <>
      <div className="mb-8 text-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>BarberShifts</Link>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Nueva contraseña</p>
      </div>
      <div className="rounded-2xl border p-7" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 12px 32px -24px rgba(31,26,23,.28)' }}>
        <h2 className="mb-2 text-lg font-bold" style={{ color: 'var(--color-text)' }}>Restablecer contraseña</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Ingresá tu nueva contraseña.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Nueva contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} autoComplete="new-password"
              className="w-full rounded-xl border px-4 py-3.5 text-[15px] leading-5 transition-[box-shadow,border-color] duration-150 focus:outline-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)', color: 'var(--color-text)', boxShadow: 'inset 0 1px 0 rgba(255,253,250,.7)', minHeight: '48px' }} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repetí tu contraseña" required minLength={6} autoComplete="new-password"
              className="w-full rounded-xl border px-4 py-3.5 text-[15px] leading-5 transition-[box-shadow,border-color] duration-150 focus:outline-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)', color: 'var(--color-text)', boxShadow: 'inset 0 1px 0 rgba(255,253,250,.7)', minHeight: '48px' }} />
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-92 disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)' }}>
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm"><Link to="/admin" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--color-text-secondary)' }}>Volver al login</Link></p>
    </>
  )
}
