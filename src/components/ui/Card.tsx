import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  padding?: boolean
  header?: ReactNode
}

export default function Card({ children, className = '', padding = true, header }: Props) {
  const classes = `bg-glass border border-glass-border rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className}`

  if (header) {
    return (
      <div className={`${classes} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-glass-border">{header}</div>
        <div className={padding ? 'p-6' : ''}>{children}</div>
      </div>
    )
  }

  return (
    <div className={`${classes} ${padding ? 'p-6' : ''}`}>
      {children}
    </div>
  )
}
