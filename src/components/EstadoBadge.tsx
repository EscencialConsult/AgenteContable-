import { Circle, CheckCircle, AlertCircle, CheckCheck } from 'lucide-react'

const config: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  pendiente: { icon: Circle, color: 'text-yellow-400', label: 'Pendiente' },
  validado: { icon: CheckCircle, color: 'text-teal', label: 'Validado' },
  observado: { icon: AlertCircle, color: 'text-error', label: 'Observado' },
  listo: { icon: CheckCheck, color: 'text-teal', label: 'Listo' },
}

export default function EstadoBadge({ estado }: { estado: string }) {
  const c = config[estado] || config.pendiente
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${c.color}`}>
      <Icon size={12} />
      {c.label}
    </span>
  )
}
