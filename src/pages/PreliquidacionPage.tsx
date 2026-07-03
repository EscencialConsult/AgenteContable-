import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, BarChart3, CheckCircle2, Eye } from 'lucide-react'
import { getAllComprobantesFlat } from '../db/repositories/comprobanteRepository'
import { formatPeriodo, getAllPeriodos } from '../db/repositories/periodoRepository'
import { calcularPreliquidacion, exportToExcel } from '../services/exportService'
import { CATEGORIA_LABELS } from '../services/validatorService'
import { formatCurrency } from '../utils/format'
import Modal from '../components/Modal'
import type { Comprobante } from '../types/comprobante'
import Button from '../components/ui/Button'
import PeriodoSelector from '../components/PeriodoSelector'

export default function PreliquidacionPage() {
  const [periodoId, setPeriodoId] = useState<number | undefined>()
  const [detalleComprobante, setDetalleComprobante] = useState<Comprobante | null>(null)

  const comprobantes = useLiveQuery(() => getAllComprobantesFlat())
  const periodos = useLiveQuery(() => getAllPeriodos())
  const periodoSeleccionado = periodos?.find((p) => p.id === periodoId)
  const periodo = periodoSeleccionado ? formatPeriodo(periodoSeleccionado) : 'Sin periodo'

  const filtradosPorPeriodo = useMemo(() => {
    if (!comprobantes || !periodoId) return []
    return comprobantes.filter((c) => c.periodoId === periodoId)
  }, [comprobantes, periodoId])

  const preliquidacion = useMemo(
    () => calcularPreliquidacion(filtradosPorPeriodo, periodo),
    [filtradosPorPeriodo, periodo],
  )

  const resumenOperativo = useMemo(() => ({
    total: filtradosPorPeriodo.length,
    pendientes: filtradosPorPeriodo.filter((c) =>
      (c.estadoRevision || c.estado) === 'pendiente'
    ).length,
    observados: filtradosPorPeriodo.filter((c) =>
      (c.estadoRevision || c.estado) === 'observado'
    ).length,
    listos: filtradosPorPeriodo.filter((c) =>
      ['validado', 'listo'].includes(c.estadoRevision || c.estado)
    ).length,
  }), [filtradosPorPeriodo])

  const faltantes = useMemo(() => {
    const hasVentas = filtradosPorPeriodo.some((c) =>
      ['venta', 'nota_credito', 'nota_debito'].includes(c.categoria)
    )
    const hasCompras = filtradosPorPeriodo.some((c) =>
      ['compra', 'gasto_deducible', 'gasto_no_computable'].includes(c.categoria)
    )
    const pendientes = filtradosPorPeriodo.filter((c) =>
      (c.estadoRevision || c.estado) === 'pendiente'
    ).length
    const observados = preliquidacion.comprobantesObservados

    return [
      {
        label: 'Comprobantes cargados',
        ok: filtradosPorPeriodo.length > 0,
        detail: filtradosPorPeriodo.length > 0
          ? `${filtradosPorPeriodo.length} comprobantes en el periodo`
          : 'Todavia no hay comprobantes cargados',
      },
      {
        label: 'Ventas del periodo',
        ok: hasVentas,
        detail: hasVentas ? 'Hay ventas/notas registradas' : 'No hay ventas registradas',
      },
      {
        label: 'Compras y gastos',
        ok: hasCompras,
        detail: hasCompras ? 'Hay compras/gastos registrados' : 'No hay compras o gastos registrados',
      },
      {
        label: 'Revision de pendientes',
        ok: pendientes === 0,
        detail: pendientes === 0 ? 'No quedan pendientes' : `${pendientes} comprobantes pendientes`,
      },
      {
        label: 'Observaciones',
        ok: observados === 0,
        detail: observados === 0 ? 'Sin observaciones bloqueantes' : `${observados} comprobantes observados`,
      },
    ]
  }, [filtradosPorPeriodo, preliquidacion.comprobantesObservados])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-glass border-b border-glass-border px-8 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-text-primary text-lg font-semibold">Preliquidación</h2>
          <p className="text-text-muted text-xs">Resumen mensual para revisión del contador</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodoSelector
            periodoId={periodoId}
            onPeriodoChange={setPeriodoId}
            compact
          />
          <Button
            onClick={() => exportToExcel(preliquidacion)}
            disabled={filtradosPorPeriodo.length === 0}
            size="sm"
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {periodoId && filtradosPorPeriodo.length === 0 && (
          <div className="max-w-5xl mx-auto mb-6">
            <FaltantesBoard faltantes={faltantes} />
          </div>
        )}

        {filtradosPorPeriodo.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <BarChart3 size={64} className="mb-4" />
            <p className="text-lg font-semibold text-text-primary mb-1">Sin datos para este período</p>
            <p className="text-sm">Cargá comprobantes en el período {periodo} o seleccioná otro mes</p>
          </div>
        )}

        {filtradosPorPeriodo.length > 0 && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-glass border border-glass-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-glass-border">
                <h3 className="text-text-primary font-semibold text-sm">Tablero de faltantes</h3>
              </div>
              <div className="divide-y divide-glass-border/50">
                {faltantes.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.ok ? (
                        <CheckCircle2 size={18} className="text-teal shrink-0" />
                      ) : (
                        <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-text-primary text-sm font-medium">{item.label}</p>
                        <p className="text-text-muted text-xs">{item.detail}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${item.ok ? 'text-teal' : 'text-yellow-400'}`}>
                      {item.ok ? 'OK' : 'Revisar'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CountCard label="Comprobantes" value={resumenOperativo.total} />
              <CountCard label="Pendientes" value={resumenOperativo.pendientes} color="text-yellow-400" />
              <CountCard label="Observados" value={preliquidacion.comprobantesObservados || resumenOperativo.observados} color="text-error" />
              <CountCard label="Listos" value={resumenOperativo.listos} color="text-teal" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card
                label="IVA Débito"
                value={preliquidacion.totalVentasIVA}
                color="text-teal"
                bg="bg-teal/10 border-teal/20"
              />
              <Card
                label="IVA Crédito"
                value={preliquidacion.totalComprasIVA}
                color="text-yellow-400"
                bg="bg-yellow-500/10 border-yellow-500/20"
              />
              <Card
                label="Percepciones"
                value={preliquidacion.percepciones}
                color="text-blue-400"
                bg="bg-blue-500/10 border-blue-500/20"
              />
              <Card
                label="Retenciones"
                value={preliquidacion.retenciones}
                color="text-purple-400"
                bg="bg-purple-500/10 border-purple-500/20"
              />
              <Card
                label="Saldo Técnico"
                value={preliquidacion.saldoTecnico}
                color={
                  preliquidacion.saldoTecnico >= 0 ? 'text-teal' : 'text-error'
                }
                bg={`border ${
                  preliquidacion.saldoTecnico >= 0
                    ? 'bg-teal/10 border-teal/20'
                    : 'bg-error-bg border-error/20'
                }`}
                big
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card
                label="Saldo Estimado"
                value={preliquidacion.saldoEstimado}
                color={preliquidacion.saldoEstimado >= 0 ? 'text-teal' : 'text-error'}
                bg="bg-glass border-glass-border"
              />
              <Card
                label="IVA No Computable"
                value={preliquidacion.totalComprasNoComputableIVA}
                color="text-text-secondary"
                bg="bg-glass border-glass-border"
              />
              <Card
                label="No Gravado"
                value={preliquidacion.noGravado}
                color="text-text-secondary"
                bg="bg-glass border-glass-border"
              />
              <Card
                label="Exento"
                value={preliquidacion.exento}
                color="text-text-secondary"
                bg="bg-glass border-glass-border"
              />
            </div>

            {preliquidacion.comprobantesObservados > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-yellow-300 text-sm">
                Hay comprobantes observados en el periodo. La preliquidacion es estimada y requiere revision antes de presentar o copiar datos.
              </div>
            )}

            <div className="bg-glass border border-glass-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-glass-border">
                <h3 className="text-text-primary font-semibold text-sm">Resumen por Alícuota</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide">
                    <th className="text-left px-6 py-3 font-medium">Alícuota</th>
                    <th className="text-right px-6 py-3 font-medium">Neto Ventas</th>
                    <th className="text-right px-6 py-3 font-medium">IVA Ventas</th>
                    <th className="text-right px-6 py-3 font-medium">Neto Compras</th>
                    <th className="text-right px-6 py-3 font-medium">IVA Credito</th>
                    <th className="text-right px-6 py-3 font-medium">IVA No Comput.</th>
                  </tr>
                </thead>
                <tbody>
                  {preliquidacion.resumenPorAlicuota.map((r) => (
                    <tr key={r.alicuota} className="border-b border-glass-border/50">
                      <td className="px-6 py-3 text-text-primary font-medium">{r.alicuota}</td>
                      <td className="px-6 py-3 text-right text-text-secondary">
                        ${formatCurrency(r.netoVentas)}
                      </td>
                      <td className="px-6 py-3 text-right text-teal">
                        ${formatCurrency(r.ivaVentas)}
                      </td>
                      <td className="px-6 py-3 text-right text-text-secondary">
                        ${formatCurrency(r.netoComprasComputable)}
                      </td>
                      <td className="px-6 py-3 text-right text-yellow-400">
                        ${formatCurrency(r.ivaComprasComputable)}
                      </td>
                      <td className="px-6 py-3 text-right text-text-muted">
                        ${formatCurrency(r.ivaComprasNoComputable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-glass-border">
                    <td className="px-6 py-3 text-text-primary font-semibold">Totales</td>
                    <td className="px-6 py-3 text-right text-text-primary font-semibold">
                      ${formatCurrency(preliquidacion.totalVentasNeto)}
                    </td>
                    <td className="px-6 py-3 text-right text-teal font-semibold">
                      ${formatCurrency(preliquidacion.totalVentasIVA)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-primary font-semibold">
                      ${formatCurrency(preliquidacion.totalComprasNeto)}
                    </td>
                    <td className="px-6 py-3 text-right text-yellow-400 font-semibold">
                      ${formatCurrency(preliquidacion.totalComprasIVA)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-semibold">
                      ${formatCurrency(preliquidacion.totalComprasNoComputableIVA)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>

            <div className="bg-glass border border-glass-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between">
                <h3 className="text-text-primary font-semibold text-sm">
                  Comprobantes del período ({filtradosPorPeriodo.length})
                </h3>
              </div>
              <div className="overflow-y-auto overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide sticky top-0 bg-navy-900">
                      <th className="text-left px-4 py-2 font-medium">Tipo</th>
                      <th className="text-left px-4 py-2 font-medium">Razón Social</th>
                      <th className="text-right px-4 py-2 font-medium">Neto</th>
                      <th className="text-right px-4 py-2 font-medium">IVA</th>
                      <th className="text-right px-4 py-2 font-medium">Total</th>
                      <th className="text-left px-4 py-2 font-medium">Categoría</th>
                      <th className="text-center px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradosPorPeriodo.map((c) => (
                      <tr key={c.id} className="border-b border-glass-border/50 hover:bg-glass-hover transition-colors">
                        <td className="px-4 py-2 text-text-primary text-xs">{c.tipo}</td>
                        <td className="px-4 py-2 text-text-secondary text-xs truncate max-w-[180px]">
                          {c.razonSocial || '—'}
                        </td>
                        <td className="px-4 py-2 text-text-secondary text-xs text-right">
                          ${formatCurrency(c.netoGravado)}
                        </td>
                        <td className="px-4 py-2 text-teal text-xs text-right">
                          ${formatCurrency(c.iva)}
                        </td>
                        <td className="px-4 py-2 text-text-primary text-xs text-right font-medium">
                          ${formatCurrency(c.total)}
                        </td>
                        <td className="px-4 py-2 text-text-secondary text-xs">
                          {CATEGORIA_LABELS[c.categoria] || c.categoria}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => setDetalleComprobante(c)}
                            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                            aria-label={`Ver detalle de ${c.tipo} ${c.razonSocial || ''}`}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!detalleComprobante}
        onClose={() => setDetalleComprobante(null)}
        title="Detalle del Comprobante"
        wide
      >
        {detalleComprobante && (
          <div className="space-y-3">
            {[
              ['Tipo', detalleComprobante.tipo],
              ['CUIT', detalleComprobante.cuit],
              ['Razón Social', detalleComprobante.razonSocial],
              ['Fecha', detalleComprobante.fecha],
              ['Neto Gravado', `$${formatCurrency(detalleComprobante.netoGravado)}`],
              ['IVA', `$${formatCurrency(detalleComprobante.iva)}`],
              ['Total', `$${formatCurrency(detalleComprobante.total)}`],
              ['Categoría', CATEGORIA_LABELS[detalleComprobante.categoria] || detalleComprobante.categoria],
              ['Estado', detalleComprobante.estado],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-glass-border/30 pb-2">
                <span className="text-text-muted text-xs">{label}</span>
                <span className="text-text-primary text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Card({
  label,
  value,
  color,
  bg,
  big,
}: {
  label: string
  value: number
  color: string
  bg: string
  big?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${bg}`}>
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`${color} ${big ? 'text-2xl' : 'text-lg'} font-bold`}>
        ${formatCurrency(value)}
      </p>
    </div>
  )
}

function CountCard({
  label,
  value,
  color = 'text-text-primary',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="rounded-lg p-4 border border-glass-border bg-glass">
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`${color} text-2xl font-bold`}>{value}</p>
    </div>
  )
}

function FaltantesBoard({
  faltantes,
}: {
  faltantes: Array<{ label: string; ok: boolean; detail: string }>
}) {
  return (
    <div className="bg-glass border border-glass-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-glass-border">
        <h3 className="text-text-primary font-semibold text-sm">Tablero de faltantes</h3>
      </div>
      <div className="divide-y divide-glass-border/50">
        {faltantes.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {item.ok ? (
                <CheckCircle2 size={18} className="text-teal shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium">{item.label}</p>
                <p className="text-text-muted text-xs">{item.detail}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold ${item.ok ? 'text-teal' : 'text-yellow-400'}`}>
              {item.ok ? 'OK' : 'Revisar'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
