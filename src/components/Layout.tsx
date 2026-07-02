import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import OfflineBanner from './OfflineBanner'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen flex bg-navy-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal focus:text-navy-900 focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Saltar al contenido principal
      </a>
      <OfflineBanner />
      <div
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden" id="main-content" role="main">
        <div className="lg:hidden flex items-center px-4 py-3 bg-navy-800/50 border-b border-glass-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden" role="region" aria-live="polite" aria-label="Contenido principal">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
