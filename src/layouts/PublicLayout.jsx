import { Outlet, Link } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header className="border-b px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-surface) 88%, transparent)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            BarberShifts
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="font-medium hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>Barberías</Link>
            <Link to="/admin" className="rounded-xl px-4 py-2 font-semibold transition hover:opacity-90" style={{ backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)' }}>
              Administración
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t px-4 py-6 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        <span>© 2026 BarberShifts</span>
        <span className="mx-2">·</span>
        <Link to="/terminos" className="underline-offset-2 hover:underline">Términos</Link>
        <span className="mx-2">·</span>
        <Link to="/privacidad" className="underline-offset-2 hover:underline">Privacidad</Link>
      </footer>
    </div>
  )
}
