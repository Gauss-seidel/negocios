import { Outlet, Link } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-500">
        <Link to="/terminos" className="hover:text-gray-700 underline-offset-2 hover:underline">Términos</Link>
        <span className="mx-2">·</span>
        <Link to="/privacidad" className="hover:text-gray-700 underline-offset-2 hover:underline">Privacidad</Link>
      </footer>
    </div>
  )
}
