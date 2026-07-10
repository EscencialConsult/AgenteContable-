import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const styles = {
  success: 'bg-teal/20 border-teal/30 text-teal',
  error: 'bg-error-bg border-error/30 text-error',
  info: 'bg-glass border-glass-border text-text-secondary',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slideIn ${styles[toast.type]}`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
