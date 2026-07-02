import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-teal to-teal-dark text-navy-900 font-semibold shadow-glow-teal hover:shadow-glow-teal-strong hover:-translate-y-0.5',
  secondary:
    'bg-glass border border-glass-border text-text-secondary hover:bg-glass-hover hover:text-text-primary',
  danger:
    'bg-gradient-to-r from-red-500 to-red-600 text-text-primary font-semibold hover:-translate-y-0.5',
  ghost:
    'text-text-muted hover:text-text-primary',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled || loading

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl uppercase tracking-wider cursor-pointer
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
