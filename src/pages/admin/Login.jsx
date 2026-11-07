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
    if (userRole === 'super_admin') navigate('/admin/dashboard', { replace: true })
    else if (userRole === 'barber') navigate('/admin/mi-trabajo', { replace: true })
    else navigate('/admin/mi-negocio', { replace: true })
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
        redirectTo: `${window.location.origin}/admin/reset-password`,
      })
      if (resetErr) throw resetErr
      setResetSent(true)
    } catch (err) {
      setResetError(err.message || 'Error al enviar email de recuperación')
    } finally {
      setResetLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2"

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
            BarberShifts
          </Link>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Panel de administración
          </p>
        </div>

        <div className="rounded-2xl border p-7" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 12px 32px -24px rgba(31,26,23,.28)' }}>
          <h2 className="mb-6 text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barberia.com"
                required
                className={inputCls}
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputCls}
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)', color: 'var(--color-text)' }}
              />
            </div>

            {error && (
              <div className="rounded-xl border p-3 text-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }} role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-92 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setResetEmail(email); setResetSent(false); setResetError('') }}
                className="whitespace-nowrap text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
            ← Ver barberías disponibles
          </Link>
        </p>
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
          <Link to="/terminos" className="hover:underline">Términos</Link>
          <span className="mx-2">·</span>
          <Link to="/privacidad" className="hover:underline">Privacidad</Link>
        </p>

        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(31,26,23,0.45)' }} onClick={() => setShowReset(false)} />
            <div className="relative w-full max-w-md rounded-2xl border p-7" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 20px 50px -30px rgba(31,26,23,.4)' }}>
              <h3 id="reset-title" className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Recuperar contraseña</h3>
              {resetSent ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border p-3 text-sm" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
                    Te enviamos un enlace de recuperación a <strong>{resetEmail}</strong>. Revisá tu bandeja de entrada.
                  </div>
                  <button type="button" onClick={() => setShowReset(false)} className="w-full rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-paper)' }}>
                    Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@barberia.com"
                    required
                    className={inputCls}
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)', color: 'var(--color-text)' }}
                  />
                  {resetError && (
                    <div className="rounded-xl border p-3 text-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }} role="alert">
                      {resetError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowReset(false)} className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-paper)' }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={resetLoading} className="flex-1 rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-92 disabled:opacity-60" style={{ backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)' }}>
                      {resetLoading ? 'Enviando…' : 'Enviar enlace'}
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
