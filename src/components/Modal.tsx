import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}

const FOCUSABLE = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, wide }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      requestAnimationFrame(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      })
    } else {
      document.body.style.overflow = ''
      previousFocus.current?.focus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !contentRef.current) return

      const elements = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeInUp" />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full mx-4 ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        } bg-navy-800 rounded-2xl border border-glass-border shadow-modal animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
          <h2 className="text-text-primary font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-xl bg-glass text-text-muted flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-glass-hover hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
