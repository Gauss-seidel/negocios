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

  // Supabase envía el token en el hash (#access_token=...&type=recovery)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) {
      setChecking(false)
      return
    }

    // Supabase procesa el token automáticamente via onAuthStateChange
    // Si hay un token válido, el usuario puede setear nueva contraseña
    const timer = setTimeout(() => {
      setValidToken(true)
      setChecking(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

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

  // Loading state
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-primary)]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  // Invalid token
  if (!validToken) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-primary)] px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent blur-3xl" />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="glass-dark rounded-3xl p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Enlace inválido</h2>
            <p className="mt-2 text-sm text-white/40">
              Este enlace de recuperación expiró o no es válido. Solicitá uno nuevo.
            </p>
            <Link
              to="/admin"
              className="mt-6 inline-block rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-primary)] px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent blur-3xl" />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="glass-dark rounded-3xl p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Contraseña actualizada</h2>
            <p className="mt-2 text-sm text-white/40">
              Redirigiendo al login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Form
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-primary)] px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent-secondary)]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-bold tracking-tight text-white">
            BarberShifts
          </Link>
          <p className="mt-2 text-sm text-white/40">
            Nueva contraseña
          </p>
        </div>

        <div className="glass-dark rounded-3xl p-8 shadow-2xl">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Restablecer contraseña
          </h2>
          <p className="mb-6 text-sm text-white/40">
            Ingresá tu nueva contraseña.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí tu contraseña"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </span>
              ) : (
                'Guardar contraseña'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/30">
          <Link to="/admin" className="font-medium text-white/50 transition-colors hover:text-white/80">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}
