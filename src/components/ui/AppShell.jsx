import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import ErrorBoundary from './ErrorBoundary'
import Breadcrumb from './Breadcrumb'
import Logo from './Logo'

function Icon({ d, className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" focusable="false" className={`${className} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const isActivePath = (pathname, itemPath, rootPath) =>
  itemPath === rootPath ? pathname === itemPath : pathname === itemPath || pathname.startsWith(itemPath + '/')

/**
 * Shared shell for the admin, super-admin and barber panels.
 * groups: [{ label?, items: [{ path, label, icon }] }]
 * mobileItems: up to 4 paths shown in the bottom bar; a "Más" button opens the full menu.
 */
export default function AppShell({ groups, rootPath, roleLabel, mobileItems = [], sidebarTop = null, showBreadcrumb = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // The drawer remembers the path it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === location.pathname
  const setOpen = (v) => setOpenOn(v ? location.pathname : null)

  const allItems = groups.flatMap((g) => g.items)
  const bottom = mobileItems.map((p) => allItems.find((i) => i.path === p)).filter(Boolean)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  const handleLogout = async () => {
    await logout()
    navigate('/admin')
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--color-bottle)] text-[var(--color-accent-ink)]">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to={rootPath} className="rounded-md" aria-label="Inicio del panel">
          <Logo tone="light" size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <Icon d="M6 18L18 6M6 6l12 12" />
        </button>
      </div>
      <div className="mx-5 h-px bg-[var(--color-brass)]/40" aria-hidden="true" />

      {sidebarTop && <div className="pt-3">{sidebarTop}</div>}

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Panel">
        {groups.map((group, gi) => (
          <div key={group.label || gi} className={gi > 0 ? 'mt-6' : ''}>
            {group.label && <p className="mb-1.5 px-3 text-xs font-medium text-white/45">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActivePath(location.pathname, item.path, rootPath)
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 ${
                        active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--color-brass)]" aria-hidden="true" />}
                      <Icon d={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brass)] text-sm font-semibold text-[var(--color-ink)]">
            {(user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.email}</p>
            {roleLabel && <p className="text-xs text-white/50">{roleLabel}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="h-[18px] w-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-[rgb(20_42_32/0.5)] animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(84vw,300px)] shadow-lg animate-[slideInLeft_0.25s_var(--ease-out-expo)_both]">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-[264px]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-paper-2)]"
            aria-label="Abrir menú"
          >
            <Icon d="M4 7h16M4 12h16M4 17h10" />
          </button>
          <Link to={rootPath} aria-label="Inicio del panel"><Logo size="sm" /></Link>
          <div className="w-11" />
        </header>

        <main className={`mx-auto w-full max-w-[80rem] px-[var(--gutter)] pt-6 lg:pt-10 lg:pb-12 ${bottom.length ? 'pb-28' : 'pb-10'}`}>
          <ErrorBoundary>
            {showBreadcrumb && <Breadcrumb />}
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom bar */}
      {bottom.length > 0 && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[var(--safe-bottom)] lg:hidden"
          aria-label="Navegación rápida"
        >
          <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${bottom.length + 1}, minmax(0, 1fr))` }}>
            {bottom.map((item) => {
              const active = isActivePath(location.pathname, item.path, rootPath)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-[var(--color-bottle)]' : 'text-[var(--color-muted)]'}`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-[var(--color-brass-soft)]' : ''}`}>
                    <Icon d={item.icon} className="h-[21px] w-[21px]" />
                  </span>
                  {item.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--color-muted)]"
            >
              <span className="flex h-7 w-12 items-center justify-center rounded-full">
                <Icon d="M5 12h.01M12 12h.01M19 12h.01" className="h-[21px] w-[21px]" />
              </span>
              Más
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
