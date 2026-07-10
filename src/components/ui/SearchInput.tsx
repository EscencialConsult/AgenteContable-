import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounce?: number
  className?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounce = 300,
  className = '',
}: Props) {
  const [local, setLocal] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLocal(value)
  }, [value])

  const handleChange = (val: string) => {
    setLocal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(val), debounce)
  }

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-navy-800 border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all duration-300 focus:border-teal/50 focus:ring-1 focus:ring-teal/30 focus:-translate-y-0.5 placeholder:text-text-muted"
      />
    </div>
  )
}
