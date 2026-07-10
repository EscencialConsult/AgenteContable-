import { type ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  color?: string
  className?: string
  icon?: ReactNode
  iconBg?: string
  iconColor?: string
}

export default function StatCard({
  label,
  value,
  color = 'text-text-primary',
  className = '',
  icon,
  iconBg,
  iconColor,
}: Props) {
  const classes = `transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className}`

  if (icon) {
    return (
      <div className={`bg-glass border border-glass-border rounded-2xl p-4 flex items-center gap-4 ${classes}`}>
        <div className={`${iconBg || 'bg-teal/20'} p-3 rounded-full ${iconColor || 'text-teal'}`}>
          {icon}
        </div>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wider">{label}</p>
          <p className="text-text-primary text-2xl font-bold">{value}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl p-4 border border-glass-border bg-glass ${classes}`}>
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`${color} text-2xl font-bold`}>{value}</p>
    </div>
  )
}
