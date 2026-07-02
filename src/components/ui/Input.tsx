import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-5 py-4 bg-glass border-2 border-glass-border rounded-xl text-text-primary text-base outline-none transition-all duration-300 placeholder:text-text-muted focus:border-teal focus:bg-glass-hover focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5 ${className}`}
      />
    </div>
  )
}
