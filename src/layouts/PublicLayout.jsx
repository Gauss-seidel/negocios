import { Outlet, Link, NavLink } from 'react-router-dom'
import Logo from '../components/ui/Logo'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="BarberShifts, inicio" className="rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2" aria-label="Principal">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hidden rounded-lg px-3 py-2 font-medium transition-colors sm:inline-flex ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`
              }
            >
              Barberías
            </NavLink>
            <Link
              to="/admin"
              className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border-strong)] px-4 font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
            >
              Soy barbería
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)]">
        <div className="container-page flex flex-col gap-4 py-8 text-sm text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/terminos" className="hover:text-[var(--color-text)]">Términos</Link>
            <Link to="/privacidad" className="hover:text-[var(--color-text)]">Privacidad</Link>
            <span className="text-[var(--color-muted)]">© {new Date().getFullYear()} BarberShifts</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
