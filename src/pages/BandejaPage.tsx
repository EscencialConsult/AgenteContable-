import { useState, useEffect, useMemo, memo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  FileText,
  FileEdit,
  Receipt,
  ClipboardList,
  Inbox,
  SearchX,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react'
import { getAllComprobantes, updateComprobante, deleteComprobante } from '../db/repositories/comprobanteRepository'
import type { Comprobante } from '../types/comprobante'
import {
  CATEGORIA_LABELS,
  getNivelGeneral,
  prepararComprobanteValidado,
  validarComprobante,
} from '../services/validatorService'
import { formatCurrency } from '../utils/format'
import FilterBar from '../components/FilterBar'
import Modal from '../components/Modal'
import ComprobanteForm from '../components/ComprobanteForm'
import EstadoBadge from '../components/EstadoBadge'
import Pagination from '../components/Pagination'
import PeriodoSelector from '../components/PeriodoSelector'
import { useToast } from '../context/ToastContext'
import Button from '../components/ui/Button'
import LoadingDots from '../components/LoadingDots'

const DEFAULT_PAGE_SIZE = 25

interface Filters {
  search: string
  categoria: string
  estado: string
  tipo: string
  periodoId: string
}

function TipoIcon({ tipo }: { tipo: string }) {
  const map: Record<string, typeof FileText> = {
    'Factura A': FileText,
    'Factura B': FileText,
    'Factura C': FileText,
    'Nota de Crédito': FileEdit,
    'Nota de Débito': FileEdit,
    Ticket: Receipt,
    Recibo: ClipboardList,
  }

  const Icon = map[tipo] || FileText
  return <Icon size={16} className="text-text-muted inline mr-2" />
}

export default function BandejaPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    categoria: '',
    estado: '',
    tipo: '',
    periodoId: '',
  })

  const [editingComprobante, setEditingComprobante] = useState<Comprobante | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [detailComprobante, setDetailComprobante] = useState<Comprobante | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const { addToast } = useToast()

  const comprobantes = useLiveQuery(() => getAllComprobantes())

  const filtered = useMemo(() => {
    if (!comprobantes) return []
    let items = [...comprobantes]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (c) =>
          c.cuit.includes(q) ||
          c.razonSocial.toLowerCase().includes(q) ||
          String(c.numero).includes(q) ||
          c.tipo.toLowerCase().includes(q),
      )
    }
    if (filters.categoria) items = items.filter((c) => c.categoria === filters.categoria)
    if (filters.estado) items = items.filter((c) => c.estado === filters.estado)
    if (filters.tipo) items = items.filter((c) => c.tipo === filters.tipo)
    if (filters.periodoId) items = items.filter((c) => c.periodoId === Number(filters.periodoId))
    return items
  }, [comprobantes, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const handleSaveEdit = async (data: Partial<Comprobante>) => {
    if (!editingComprobante?.id) return
    try {
      const validado = await prepararComprobanteValidado({
        ...editingComprobante,
        ...data,
        id: editingComprobante.id,
      })
      const duplicado = validado.validaciones?.some((v) => v.tipo === 'duplicado')

      if (duplicado) {
        addToast('error', 'Comprobante duplicado')
        return
      }

      await updateComprobante(editingComprobante.id, validado)
      setShowEditModal(false)
      setEditingComprobante(null)
      addToast('success', 'Comprobante actualizado')
    } catch {
      console.error('Update error')
      addToast('error', 'Error al actualizar el comprobante')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteComprobante(id)
      setDeleteConfirm(null)
      addToast('success', 'Comprobante eliminado')
    } catch {
      console.error('Delete error')
      addToast('error', 'Error al eliminar el comprobante')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-glass border-b border-glass-border px-8 py-4 flex-shrink-0">
        <h2 className="text-text-primary text-lg font-semibold mb-3">Bandeja de Comprobantes</h2>
        <div className="mb-3">
          <PeriodoSelector
            periodoId={filters.periodoId ? Number(filters.periodoId) : undefined}
            onPeriodoChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                periodoId: value ? String(value) : '',
              }))
            }
            allowEmpty
            compact
          />
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!comprobantes && (
          <div className="flex items-center justify-center h-full">
            <LoadingDots />
          </div>
        )}

        {comprobantes && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            {comprobantes.length === 0 ? (
              <Inbox size={64} className="mb-4" />
            ) : (
              <SearchX size={64} className="mb-4" />
            )}
            <p className="text-lg font-semibold text-text-primary mb-1">
              {comprobantes.length === 0 ? 'No hay comprobantes cargados' : 'Sin resultados'}
            </p>
            <p className="text-sm">
              {comprobantes.length === 0
                ? 'Cargá comprobantes desde la sección "Cargar"'
                : 'Probá con otros filtros'}
            </p>
          </div>
        )}

        {comprobantes && filtered.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-navy-900 z-10">
              <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">CUIT / Razón Social</th>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-center px-4 py-3 font-medium">Val.</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((c) => (
                <Row
                  key={c.id}
                  comprobante={c}
                  onView={() => setDetailComprobante(c)}
                  onEdit={() => {
                    setEditingComprobante(c)
                    setShowEditModal(true)
                  }}
                  onDelete={() => setDeleteConfirm(c.id!)}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {comprobantes && filtered.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      )}

      <Modal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingComprobante(null) }}
        title="Editar Comprobante"
        wide
      >
        {editingComprobante && (
          <ComprobanteForm
            initial={editingComprobante}
            onSave={handleSaveEdit}
            onCancel={() => { setShowEditModal(false); setEditingComprobante(null) }}
          />
        )}
      </Modal>

      <Modal
        open={!!detailComprobante}
        onClose={() => setDetailComprobante(null)}
        title="Detalle del Comprobante"
        wide
      >
        {detailComprobante && <DetailView comprobante={detailComprobante} />}
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
      >
        <p className="text-text-secondary text-sm mb-6">
          ¿Estás seguro de que querés eliminar este comprobante? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            className="flex-1"
          >
            Eliminar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

const Row = memo(function Row({
  comprobante: c,
  onView,
  onEdit,
  onDelete,
}: {
  comprobante: Comprobante
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [validaciones, setValidaciones] = useState<Awaited<ReturnType<typeof validarComprobante>>>(
    c.validaciones || [],
  )

  useEffect(() => {
    if (c.validaciones) {
      setValidaciones(c.validaciones)
    } else {
      validarComprobante(c).then(setValidaciones)
    }
  }, [c])

  const nivelGeneral = c.nivelValidacion || getNivelGeneral(validaciones)

  return (
    <tr
      className="border-b border-glass-border/50 hover:bg-glass-hover transition-colors group"
      tabIndex={0}
      role="row"
      onKeyDown={(e) => {
        if (e.key === 'Enter') onView()
      }}
    >
      <td className="px-4 py-3">
        <TipoIcon tipo={c.tipo} />
        <span className="text-text-primary text-xs">{c.tipo}</span>
      </td>
      <td className="px-4 py-3">
        <div className="text-text-primary text-xs font-medium truncate max-w-[200px]">
          {c.razonSocial || '—'}
        </div>
        <div className="text-text-muted text-[11px]">{c.cuit || '—'}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary text-xs">
        {c.fecha || '—'}
      </td>
      <td className="px-4 py-3 text-text-primary text-xs text-right font-medium">
        ${formatCurrency(c.total)}
      </td>
      <td className="px-4 py-3 text-text-secondary text-xs">
        {CATEGORIA_LABELS[c.categoria] || c.categoria}
      </td>
      <td className="px-4 py-3 text-xs"><EstadoBadge estado={c.estado} /></td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
            nivelGeneral === 'error'
              ? 'bg-error-bg text-error'
              : nivelGeneral === 'warning'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-teal/20 text-teal'
          }`}
          title={validaciones.map((v) => v.mensaje).join('\n')}
        >
          {validaciones.length}
          <span className="sr-only">
            {nivelGeneral === 'error'
              ? 'con errores'
              : nivelGeneral === 'warning'
                ? 'con advertencias'
                : 'sin observaciones'}
          </span>
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView} aria-label="Ver detalle" className="p-1.5 bg-glass border border-glass-border rounded-md text-text-muted cursor-pointer transition-all hover:bg-glass-hover hover:text-text-primary">
            <Eye size={14} />
          </button>
          <button onClick={onEdit} aria-label="Editar" className="p-1.5 bg-glass border border-glass-border rounded-md text-text-muted cursor-pointer transition-all hover:bg-glass-hover hover:text-text-primary">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} aria-label="Eliminar" className="p-1.5 bg-glass border border-glass-border rounded-md text-text-muted cursor-pointer transition-all hover:bg-error-bg hover:text-error">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}, (prev, next) =>
  prev.comprobante.id === next.comprobante.id &&
  prev.comprobante.estado === next.comprobante.estado &&
  prev.comprobante.estadoRevision === next.comprobante.estadoRevision &&
  prev.comprobante.nivelValidacion === next.comprobante.nivelValidacion &&
  prev.comprobante.validatedAt === next.comprobante.validatedAt
)

function DetailView({ comprobante: c }: { comprobante: Comprobante }) {
  const [validaciones, setValidaciones] = useState<Awaited<ReturnType<typeof validarComprobante>>>(
    c.validaciones || [],
  )

  useEffect(() => {
    if (c.validaciones) {
      setValidaciones(c.validaciones)
    } else {
      validarComprobante(c).then(setValidaciones)
    }
  }, [c])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {[
          ['Tipo', c.tipo],
          ['CUIT', c.cuit],
          ['Razón Social', c.razonSocial],
          ['Fecha de Emisión', c.fecha],
          ['Punto de Venta', String(c.puntoVenta)],
          ['Número', String(c.numero)],
          ['Condición IVA', c.condicionIVA],
          ['CAE', c.cae || '—'],
          ['Fecha Vencimiento', c.fechaVencimiento || '—'],
          ['Categoría', c.categoria],
          ['Estado', c.estado],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-text-muted text-[11px] uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-text-primary text-sm break-all">{value || '—'}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Importes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Neto Gravado', c.netoGravado],
            ['IVA', c.iva],
            ['No Gravado', c.noGravado || 0],
            ['Exento', c.exento || 0],
            ['Percepciones', c.percepciones],
            ['Retenciones', c.retenciones],
            ['Total', c.total],
          ].map(([label, value]) => (
            <div key={label as string} className="p-3 bg-navy-800 rounded-lg border border-glass-border">
              <p className="text-text-muted text-[10px] uppercase mb-0.5">{label as string}</p>
              <p className="text-text-primary text-sm font-semibold">
                ${formatCurrency(value as number)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {c.moneda && c.moneda !== 'ARS' && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Moneda original</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Moneda', c.moneda],
              ['Tipo cambio', c.tipoCambio?.toFixed(6) || '—'],
              ['Neto original', c.netoGravadoMonedaOriginal || 0],
              ['IVA original', c.ivaMonedaOriginal || 0],
              ['Total original', c.totalMonedaOriginal || 0],
              ['Total ARS', c.totalPesos || c.total],
            ].map(([label, value]) => (
              <div key={label as string} className="p-3 bg-navy-800 rounded-lg border border-glass-border">
                <p className="text-text-muted text-[10px] uppercase mb-0.5">{label as string}</p>
                <p className="text-text-primary text-sm font-semibold">
                  {typeof value === 'number' ? formatCurrency(value) : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.clasificacionFiscal && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Clasificacion fiscal</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Tratamiento IVA', c.clasificacionFiscal.tratamientoIVA.replace(/_/g, ' ')],
              ['Afecta preliquidacion', c.clasificacionFiscal.afectaPreliquidacion ? 'Si' : 'No'],
              ['Requiere CAE', c.clasificacionFiscal.requiereCAE ? 'Si' : 'No'],
              ['Confianza', `${Math.round(c.clasificacionFiscal.confianza * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-navy-800 rounded-lg border border-glass-border">
                <p className="text-text-muted text-[10px] uppercase mb-0.5">{label}</p>
                <p className="text-text-primary text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {c.clasificacionFiscal.motivos.length > 0 && (
            <p className="text-text-secondary text-xs mt-2">
              {c.clasificacionFiscal.motivos.join('; ')}
            </p>
          )}
        </div>
      )}

      {c.ivaDetalle && c.ivaDetalle.length > 0 && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Detalle IVA</p>
          <div className="overflow-x-auto border border-glass-border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-glass-border text-text-muted uppercase">
                  <th className="text-left px-3 py-2 font-medium">Alicuota</th>
                  <th className="text-right px-3 py-2 font-medium">Neto</th>
                  <th className="text-right px-3 py-2 font-medium">IVA</th>
                </tr>
              </thead>
              <tbody>
                {c.ivaDetalle.map((linea, index) => (
                  <tr key={`${linea.alicuota}-${index}`} className="border-b border-glass-border/40">
                    <td className="px-3 py-2 text-text-primary">{linea.alicuota}</td>
                    <td className="px-3 py-2 text-right text-text-secondary">
                      ${formatCurrency(linea.neto)}
                    </td>
                    <td className="px-3 py-2 text-right text-teal">
                      ${formatCurrency(linea.iva)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validaciones.length > 0 && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-2">Validaciones</p>
          <div className="space-y-1.5">
            {validaciones.map((v, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-xs border ${
                  v.nivel === 'error'
                    ? 'bg-error-bg border-error/30 text-error'
                    : v.nivel === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                      : 'bg-teal/10 border-teal/30 text-teal'
                }`}
              >
                {v.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}

      {c.observaciones && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Observaciones</p>
          <p className="text-text-secondary text-sm">{c.observaciones}</p>
        </div>
      )}

      {c.archivoBase64 && (
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Archivo adjunto</p>
          <img
            src={c.archivoBase64}
            alt={c.fileName || 'Comprobante'}
            className="max-w-full rounded-lg border border-glass-border"
          />
        </div>
      )}
    </div>
  )
}
