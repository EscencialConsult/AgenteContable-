import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  ClipboardList,
  Upload,
  BarChart3,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'
import { LOGO_URL_DARK, LOGO_URL_LIGHT } from '../config'

const navItems = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/bandeja', label: 'Comprobantes', icon: ClipboardList },
  { to: '/upload', label: 'Cargar', icon: Upload },
  { to: '/preliquidacion', label: 'Preliquidación', icon: BarChart3 },
  { to: '/backup', label: 'Backup', icon: ShieldCheck },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [logoError, setLogoError] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const logoSrc = theme === 'dark' ? LOGO_URL_DARK : LOGO_URL_LIGHT

  useEffect(() => {
    setLogoError(false)
  }, [logoSrc])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 h-full bg-navy-800/50 backdrop-blur-xl border-r border-glass-border flex flex-col">
      <div className="p-6 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoError ? (
            <div className="w-9 h-9 rounded-lg bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0">
              <span className="text-teal text-xs font-bold">E</span>
            </div>
          ) : (
            <img
              src={logoSrc}
              alt="Escencial"
              className="h-9 w-auto object-contain max-w-[140px]"
              loading="lazy"
              onError={() => setLogoError(true)}
            />
          )}
          <div>
            <h1 className="text-text-primary font-bold text-sm tracking-wide">ESCENCIAL</h1>
            <p className="text-text-muted text-xs">Agente Contable</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="Navegación principal">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal/20 text-teal border border-teal/30'
                  : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary border border-transparent'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-glass-border space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:bg-glass-hover hover:text-text-primary transition-all duration-200 border border-transparent hover:border-glass-border"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:bg-error-bg hover:text-error transition-all duration-200 border border-transparent hover:border-error/30"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>
    </aside>
  )
}
