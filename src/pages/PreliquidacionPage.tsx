import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, Eye } from 'lucide-react'
import { getAllComprobantesFlat } from '../db/repositories/comprobanteRepository'
import { calcularPreliquidacion, exportToExcel } from '../services/exportService'
import { CATEGORIA_LABELS } from '../services/validatorService'
import { formatCurrency } from '../utils/format'
import Modal from '../components/Modal'
import Select from '../components/ui/Select'
import type { Comprobante } from '../types/comprobante'
import Button from '../components/ui/Button'

function getMeses() {
  const meses: string[] = []
  const hoy = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    meses.push(`${mes}/${d.getFullYear()}`)
  }
  return meses
}

export default function PreliquidacionPage() {
  const [periodo, setPeriodo] = useState(() => {
    const hoy = new Date()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')
    return `${mes}/${hoy.getFullYear()}`
  })

  const [detalleComprobante, setDetalleComprobante] = useState<Comprobante | null>(null)

  const comprobantes = useLiveQuery(() => getAllComprobantesFlat())

  const filtradosPorPeriodo = useMemo(() => {
    if (!comprobantes) return []
    const [mes, anio] = periodo.split('/')
    return comprobantes.filter((c) => {
      if (!c.fecha) return false
      const partes = c.fecha.split(/[/-]/)
      if (partes.length !== 3) return false
      const m = partes[1]
      const yearRaw = partes[2]
      const anioC = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
      return m === mes && anioC === anio
    })
  }, [comprobantes, periodo])

  const preliquidacion = useMemo(
    () => calcularPreliquidacion(filtradosPorPeriodo, periodo),
    [filtradosPorPeriodo, periodo],
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-glass border-b border-glass-border px-8 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-text-primary text-lg font-semibold">Preliquidación</h2>
          <p className="text-text-muted text-xs">Resumen mensual para revisión del contador</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {getMeses().map((m) => (
              <option key={m} value={m} className="bg-navy-800">
                {m}
              </option>
            ))}
          </Select>
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
        {filtradosPorPeriodo.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <BarChart3 size={64} className="mb-4" />
            <p className="text-lg font-semibold text-text-primary mb-1">Sin datos para este período</p>
            <p className="text-sm">Cargá comprobantes en el período {periodo} o seleccioná otro mes</p>
          </div>
        )}

        {filtradosPorPeriodo.length > 0 && (
          <div className="space-y-6 max-w-5xl mx-auto">
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
                    <th className="text-right px-6 py-3 font-medium">IVA Compras</th>
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
                        ${formatCurrency(r.netoCompras)}
                      </td>
                      <td className="px-6 py-3 text-right text-yellow-400">
                        ${formatCurrency(r.ivaCompras)}
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
