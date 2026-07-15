import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const { login, isAuthenticated, userRole } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    if (userRole === 'super_admin') {
      navigate('/admin/dashboard', { replace: true })
    } else if (userRole === 'barber') {
      navigate('/admin/mi-trabajo', { replace: true })
    } else {
      navigate('/admin/mi-negocio', { replace: true })
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas'
        : 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!resetEmail.trim()) { setResetError('Ingresa tu email'); return }
    setResetLoading(true)
    setResetError('')
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      })
      if (resetErr) throw resetErr
      setResetSent(true)
    } catch (err) {
      setResetError(err.message || 'Error al enviar email de recuperación')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-primary)] px-4">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent-secondary)]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-bold tracking-tight text-white">
            BarberShifts
          </Link>
          <p className="mt-2 text-sm text-white/40">
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <div className="glass-dark rounded-3xl p-8 shadow-2xl">
          <h2 className="mb-6 text-lg font-semibold text-white">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barberia.com"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setResetEmail(email); setResetSent(false); setResetError('') }}
                className="text-sm text-white/40 transition-colors hover:text-white/70"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/30">
          <Link to="/" className="font-medium text-white/50 transition-colors hover:text-white/80">
            Ver barberías disponibles
          </Link>
        </p>

        {/* Forgot password modal */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReset(false)} />
            <div className="relative w-full max-w-md rounded-3xl bg-gray-900 p-8 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">Recuperar contraseña</h3>
              {resetSent ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
                    Te enviamos un enlace de recuperación a <strong>{resetEmail}</strong>. Revisá tu bandeja de entrada.
                  </div>
                  <button
                    onClick={() => setShowReset(false)}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20"
                  >
                    Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
                  <p className="text-sm text-white/50">
                    Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@barberia.com"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
                  />
                  {resetError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                      {resetError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-white/60 transition-all hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
