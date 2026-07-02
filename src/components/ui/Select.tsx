import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export default function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`px-4 py-2 bg-navy-800 border border-glass-border rounded-lg text-text-primary text-sm outline-none transition-all duration-300 cursor-pointer hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5 ${className}`}
      >
        {children}
      </select>
    </div>
  )
}
