import { type ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, children, className = '' }: Props) {
  return (
    <div className={`bg-glass border-b border-glass-border px-8 py-4 flex-shrink-0 flex items-center justify-between ${className}`}>
      <div>
        <h2 className="text-text-primary text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-text-muted text-xs">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
