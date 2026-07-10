import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, BarChart3, CheckCircle2, Eye } from 'lucide-react'
import { getAllComprobantesFlat, getComprobantesFlatByCliente } from '../db/repositories/comprobanteRepository'
import { formatPeriodo, getAllPeriodos, getPeriodosByCliente } from '../db/repositories/periodoRepository'
import { calcularPreliquidacion } from '../services/preliquidacionService'
import { exportToExcel } from '../services/exportService'
import { CATEGORIA_LABELS } from '../services/validatorService'
import { formatCurrency } from '../utils/format'
import Modal from '../components/Modal'
import type { Comprobante } from '../types/comprobante'
import { useCliente } from '../hooks/useCliente'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import PeriodoSelector from '../components/PeriodoSelector'

export default function PreliquidacionPage() {
  const [periodoId, setPeriodoId] = useState<number | undefined>()
  const [detalleComprobante, setDetalleComprobante] = useState<Comprobante | null>(null)
  const { clienteActivo } = useCliente()

  const comprobantes = useLiveQuery(
    () => clienteActivo?.id ? getComprobantesFlatByCliente(clienteActivo.id) : getAllComprobantesFlat(),
    [clienteActivo?.id],
  )
  const periodos = useLiveQuery(
    () => clienteActivo?.id ? getPeriodosByCliente(clienteActivo.id) : getAllPeriodos(),
    [clienteActivo?.id],
  )
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
    sinClasificar: preliquidacion.comprobantesSinClasificar,
    noAfectan: preliquidacion.comprobantesNoAfectan,
    incluidos: preliquidacion.comprobantesIncluidos,
    listos: filtradosPorPeriodo.filter((c) =>
      ['validado', 'listo'].includes(c.estadoRevision || c.estado)
    ).length,
  }), [filtradosPorPeriodo, preliquidacion])

  const faltantes = useMemo(() => {
    const hasVentas = preliquidacion.totalVentasNeto !== 0 || preliquidacion.totalVentasIVA !== 0
    const hasCompras = preliquidacion.totalComprasNeto !== 0 ||
      preliquidacion.totalComprasIVA !== 0 ||
      preliquidacion.totalComprasNoComputableNeto !== 0 ||
      preliquidacion.totalComprasNoComputableIVA !== 0
    const pendientes = filtradosPorPeriodo.filter((c) =>
      (c.estadoRevision || c.estado) === 'pendiente'
    ).length
    const observados = preliquidacion.comprobantesObservados
    const sinClasificar = preliquidacion.comprobantesSinClasificar

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
        label: 'Clasificacion fiscal',
        ok: sinClasificar === 0,
        detail: sinClasificar === 0 ? 'Todos tienen circuito fiscal' : `${sinClasificar} comprobantes sin clasificar`,
      },
      {
        label: 'Observaciones',
        ok: observados === 0,
        detail: observados === 0 ? 'Sin observaciones bloqueantes' : `${observados} comprobantes observados`,
      },
    ]
  }, [
    filtradosPorPeriodo,
    preliquidacion.comprobantesObservados,
    preliquidacion.comprobantesSinClasificar,
    preliquidacion.totalComprasIVA,
    preliquidacion.totalComprasNeto,
    preliquidacion.totalComprasNoComputableIVA,
    preliquidacion.totalComprasNoComputableNeto,
    preliquidacion.totalVentasIVA,
    preliquidacion.totalVentasNeto,
  ])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Preliquidación" subtitle="Resumen mensual para revisión del contador">
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
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 animate-fadeInUp">
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
            <Card header={<h3 className="text-text-primary font-semibold text-sm">Tablero de faltantes</h3>} padding={false}>
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
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Comprobantes" value={resumenOperativo.total} />
              <StatCard label="Incluidos IVA" value={resumenOperativo.incluidos} color="text-teal" />
              <StatCard label="Pendientes" value={resumenOperativo.pendientes} color="text-yellow-400" />
              <StatCard label="Observados" value={preliquidacion.comprobantesObservados || resumenOperativo.observados} color="text-error" />
              <StatCard label="Sin clasificar" value={resumenOperativo.sinClasificar} color="text-yellow-400" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="IVA Débito" value={`$${formatCurrency(preliquidacion.totalVentasIVA)}`} color="text-teal" className="bg-teal/10 border-teal/20 rounded-2xl p-5" />
              <StatCard label="IVA Crédito" value={`$${formatCurrency(preliquidacion.totalComprasIVA)}`} color="text-yellow-400" className="bg-yellow-500/10 border-yellow-500/20 rounded-2xl p-5" />
              <StatCard label="Percepciones" value={`$${formatCurrency(preliquidacion.percepciones)}`} color="text-blue-400" className="bg-blue-500/10 border-blue-500/20 rounded-2xl p-5" />
              <StatCard label="Retenciones" value={`$${formatCurrency(preliquidacion.retenciones)}`} color="text-purple-400" className="bg-purple-500/10 border-purple-500/20 rounded-2xl p-5" />
              <StatCard
                label="Saldo Técnico"
                value={`$${formatCurrency(preliquidacion.saldoTecnico)}`}
                color={preliquidacion.saldoTecnico >= 0 ? 'text-teal' : 'text-error'}
                className={`rounded-2xl p-5 border ${
                  preliquidacion.saldoTecnico >= 0
                    ? 'bg-teal/10 border-teal/20'
                    : 'bg-error-bg border-error/20'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Saldo Estimado" value={`$${formatCurrency(preliquidacion.saldoEstimado)}`} color={preliquidacion.saldoEstimado >= 0 ? 'text-teal' : 'text-error'} className="bg-glass border-glass-border rounded-2xl p-5" />
              <StatCard label="IVA No Computable" value={`$${formatCurrency(preliquidacion.totalComprasNoComputableIVA)}`} color="text-text-secondary" className="bg-glass border-glass-border rounded-2xl p-5" />
              <StatCard label="No Gravado" value={`$${formatCurrency(preliquidacion.noGravado)}`} color="text-text-secondary" className="bg-glass border-glass-border rounded-2xl p-5" />
              <StatCard label="Exento" value={`$${formatCurrency(preliquidacion.exento)}`} color="text-text-secondary" className="bg-glass border-glass-border rounded-2xl p-5" />
            </div>

            {preliquidacion.comprobantesObservados > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-yellow-300 text-sm">
                Hay comprobantes observados en el periodo. La preliquidacion es estimada y requiere revision antes de presentar o copiar datos.
              </div>
            )}

            {preliquidacion.comprobantesNoAfectan > 0 && (
              <div className="bg-error-bg border border-error/30 rounded-lg px-4 py-3 text-error text-sm">
                {preliquidacion.comprobantesNoAfectan} comprobantes no afectan el calculo de IVA por estar sin clasificar o marcados como no computables.
              </div>
            )}

            <Card header={<h3 className="text-text-primary font-semibold text-sm">Resumen por Alícuota</h3>} padding={false}>
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
            </Card>

            <Card header={
              <div className="flex items-center justify-between">
                <h3 className="text-text-primary font-semibold text-sm">
                  Comprobantes del período ({filtradosPorPeriodo.length})
                </h3>
              </div>
            } padding={false}>
              <div className="overflow-y-auto overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide sticky top-0 bg-navy-900">
                      <th className="text-left px-4 py-3 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium">Razón Social</th>
                      <th className="text-right px-4 py-3 font-medium">Neto</th>
                      <th className="text-right px-4 py-3 font-medium">IVA</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-left px-4 py-3 font-medium">Categoría</th>
                      <th className="text-center px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradosPorPeriodo.map((c) => (
                      <tr key={c.id} className="border-b border-glass-border/50 hover:bg-glass-hover transition-colors">
                        <td className="px-4 py-3 text-text-primary text-xs">{c.tipo}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[180px]">
                          {c.razonSocial || '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs text-right">
                          ${formatCurrency(c.netoGravado)}
                        </td>
                        <td className="px-4 py-3 text-teal text-xs text-right">
                          ${formatCurrency(c.iva)}
                        </td>
                        <td className="px-4 py-3 text-text-primary text-xs text-right font-medium">
                          ${formatCurrency(c.total)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {CATEGORIA_LABELS[c.categoria] || c.categoria}
                        </td>
                        <td className="px-4 py-3 text-center">
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
            </Card>
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

function FaltantesBoard({
  faltantes,
}: {
  faltantes: Array<{ label: string; ok: boolean; detail: string }>
}) {
  return (
    <Card header={<h3 className="text-text-primary font-semibold text-sm">Tablero de faltantes</h3>} padding={false}>
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
    </Card>
  )
}
