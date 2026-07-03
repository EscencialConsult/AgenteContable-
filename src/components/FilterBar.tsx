import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { CATEGORIA_OPTIONS, ESTADO_OPTIONS, TIPO_OPTIONS } from '../config'

interface Filters {
  search: string
  categoria: string
  estado: string
  tipo: string
  periodoId: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLocalSearch(filters.search)
  }, [filters.search])

  const update = (field: keyof Filters, value: string) => {
    onChange({ ...filters, [field]: value })
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      update('search', value)
    }, 300)
  }

  const selectClass =
    'px-3 py-2 bg-navy-800 border border-glass-border rounded-lg text-text-primary text-sm outline-none transition-all duration-200 focus:border-teal focus:shadow-[0_0_0_3px_rgba(106,213,203,0.15)] appearance-none cursor-pointer min-w-[160px]'

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Buscar por CUIT, razón social..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-glass-border rounded-lg text-text-primary text-sm outline-none transition-all duration-200 focus:border-teal focus:shadow-[0_0_0_3px_rgba(106,213,203,0.15)] placeholder:text-text-muted"
        />
      </div>

      <select
        className={selectClass}
        value={filters.categoria}
        onChange={(e) => update('categoria', e.target.value)}
      >
        <option value="" className="bg-navy-800">Todas las categorías</option>
        {CATEGORIA_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-800">
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.tipo}
        onChange={(e) => update('tipo', e.target.value)}
      >
        <option value="" className="bg-navy-800">Todos los tipos</option>
        {TIPO_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-800">
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.estado}
        onChange={(e) => update('estado', e.target.value)}
      >
        <option value="" className="bg-navy-800">Todos los estados</option>
        {ESTADO_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-800">
            {opt.label}
          </option>
        ))}
      </select>

      {Object.values(filters).some((v) => v !== '') && (
        <button
          onClick={() =>
            onChange({
              search: '',
              categoria: '',
              estado: '',
              tipo: '',
              periodoId: '',
            })
          }
          className="px-3 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
