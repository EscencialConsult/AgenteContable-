import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZES = [10, 25, 50]

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-8 py-3 bg-glass border-t border-glass-border flex-shrink-0">
      <p className="text-text-muted text-xs">{totalItems} comprobantes</p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs">Filas por página</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-navy-800 border border-glass-border rounded-xl text-text-primary text-xs outline-none cursor-pointer transition-all duration-300 hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s} className="bg-navy-800">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-text-muted text-xs">
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-glass-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers(currentPage, totalPages).map((p, i) =>
            p === -1 ? (
              <span key={`ellipsis-${i}`} className="text-text-muted text-xs px-1">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900 ${
                  p === currentPage
                    ? 'bg-teal/20 text-teal border border-teal/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-glass-hover'
                }`}
                aria-label={`Ir a página ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-glass-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: number[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push(-1)
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push(-1)
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push(-1)
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push(-1)
    pages.push(total)
  }

  return pages
}
