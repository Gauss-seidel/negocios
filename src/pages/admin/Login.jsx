import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, userRole } = useAuth()
  const captchaLoadedRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || captchaLoadedRef.current) return
    captchaLoadedRef.current = true
    const el = document.createElement('script')
    el.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    el.async = true
    el.defer = true
    document.head.appendChild(el)
  }, [])

  async function getCaptchaToken() {
    if (!RECAPTCHA_SITE_KEY || typeof grecaptcha === 'undefined') return null
    try {
      return await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' })
    } catch {
      return null
    }
  }

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
      const captchaToken = await getCaptchaToken()
      await login(email, password, captchaToken)
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas'
        : 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
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
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/30">
          <Link to="/" className="font-medium text-white/50 transition-colors hover:text-white/80">
            Ver barberías disponibles
          </Link>
        </p>
      </div>
    </div>
  )
}
