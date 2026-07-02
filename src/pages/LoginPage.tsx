import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LOGO_URL_DARK, LOGO_URL_LIGHT } from '../config'
import { useTheme } from '../context/ThemeContext'
import { User, Lock, AlertTriangle, ArrowRight, FileText, BrainCircuit, BarChart2, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [focusedField, setFocusedField] = useState<'nombre' | 'dni' | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme } = useTheme()

  const logoSrc = theme === 'dark' ? LOGO_URL_DARK : LOGO_URL_LIGHT

  useEffect(() => {
    setLogoError(false)
  }, [logoSrc])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('Por favor ingresá tu nombre.')
      return
    }
    if (!dni.trim()) {
      setError('Por favor ingresá tu DNI.')
      return
    }

    setLoading(true)
    try {
      await login(dni.trim(), nombre.trim())
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-navy-900 font-[Inter,system-ui,sans-serif]">
      {/* ── Left decorative panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-teal/30 via-navy-800 to-navy-900 flex-col justify-between p-12">
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-72 h-72 rounded-full bg-teal/10 blur-3xl -top-16 -left-16 animate-pulse" />
          <div className="absolute w-96 h-96 rounded-full bg-teal/5 blur-3xl bottom-0 right-0 animate-pulse [animation-delay:1.5s]" />
          <div className="absolute w-48 h-48 rounded-full bg-teal/15 blur-2xl top-1/2 left-1/3 animate-pulse [animation-delay:3s]" />
        </div>

        {/* Top: brand */}
        <div className="relative z-10">
          {logoError ? (
            <div className="w-16 h-16 rounded-2xl bg-teal/20 border border-teal/30 flex items-center justify-center mb-8">
              <span className="text-teal text-2xl font-bold">E</span>
            </div>
          ) : (
            <img
              src={logoSrc}
              alt="Escencial"
              className="h-14 w-auto object-contain mb-8 animate-glow"
              fetchPriority="high"
              onError={() => setLogoError(true)}
            />
          )}
          <h1 className="text-text-primary text-4xl font-bold leading-tight mb-3">
            Agente<br />
            <span className="text-teal">Contable</span>
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-xs">
            Tu asistente inteligente para gestión contable, impuestos y comprobantes.
          </p>
        </div>

        {/* Center: stat cards */}
        <div className="relative z-10 space-y-3">
          {[
            { Icon: FileText,    label: 'Comprobantes',  value: 'OCR automático' },
            { Icon: BrainCircuit, label: 'IA Contable',   value: 'Consultas 24/7' },
            { Icon: BarChart2,   label: 'Preliquidación', value: 'IVA en segundos' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 bg-glass/30 backdrop-blur-xl rounded-xl px-4 py-3 border border-glass-border">
              <div className="w-9 h-9 rounded-lg bg-teal/15 border border-teal/20 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-teal" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">{label}</p>
                <p className="text-text-muted text-xs">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: tagline */}
        <p className="relative z-10 text-text-muted text-xs">
          Fabricado por <span className="text-teal font-medium">Escencial</span>
        </p>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Subtle bg particles */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-teal/5 animate-float pointer-events-none"
            style={{
              width: `${50 + i * 25}px`,
              height: `${50 + i * 25}px`,
              left: `${15 + i * 22}%`,
              top: `${10 + i * 18}%`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}

        {/* Card */}
        <div className="relative z-10 w-full max-w-md animate-slideIn">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {logoError ? (
              <div className="w-12 h-12 rounded-2xl bg-teal/20 border border-teal/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-teal text-xl font-bold">E</span>
              </div>
            ) : (
              <img src={logoSrc} alt="Escencial" className="h-10 w-auto object-contain mx-auto mb-3" onError={() => setLogoError(true)} />
            )}
            <h1 className="text-text-primary text-2xl font-bold">Agente <span className="text-teal">Contable</span></h1>
          </div>

          <div className="bg-glass backdrop-blur-2xl rounded-3xl p-10 shadow-card border border-glass-border">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-teal" />
                </div>
                <h2 className="text-text-primary text-2xl font-bold">Bienvenido</h2>
              </div>
              <p className="text-text-muted text-sm">Ingresá tus datos para acceder.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Nombre field */}
              <div>
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                  Usuario
                </label>
                <div className={`flex items-center gap-3 bg-glass/50 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ${
                  focusedField === 'nombre'
                    ? 'border-teal shadow-[0_0_0_3px_rgba(106,213,203,0.12)]'
                    : 'border-glass-border'
                }`}>
                  <User size={17} className={`shrink-0 transition-colors duration-200 ${focusedField === 'nombre' ? 'text-teal' : 'text-text-muted'}`} />
                  <input
                    id="login-nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onFocus={() => setFocusedField('nombre')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Tu usuario"
                    autoComplete="name"
                    className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>

              {/* DNI field */}
              <div>
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                  DNI
                </label>
                <div className={`flex items-center gap-3 bg-glass/50 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ${
                  focusedField === 'dni'
                    ? 'border-teal shadow-[0_0_0_3px_rgba(106,213,203,0.12)]'
                    : 'border-glass-border'
                }`}>
                  <Lock size={17} className={`shrink-0 transition-colors duration-200 ${focusedField === 'dni' ? 'text-teal' : 'text-text-muted'}`} />
                  <input
                    id="login-dni"
                    type="text"
                    inputMode="numeric"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))}
                    onFocus={() => setFocusedField('dni')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Número de DNI"
                    maxLength={8}
                    autoComplete="off"
                    className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted tracking-widest"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-error-bg border border-[rgba(255,82,82,0.25)] text-error px-4 py-3 rounded-xl text-sm animate-slideIn">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer mt-2 ${
                  loading
                    ? 'bg-teal/50 text-navy-900/70 cursor-not-allowed'
                    : 'bg-teal text-navy-900 hover:bg-teal/85 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_24px_rgba(106,213,203,0.4)]'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Acceder al Sistema
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
