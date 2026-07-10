import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ChevronDown, Receipt, RefreshCw, Scale } from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { getAllComprobantesFlat, getComprobantesFlatByCliente } from '../db/repositories/comprobanteRepository'
import {
  calcularFacturacionAnualDesde,
  obtenerCategoriaRecomendada,
  getTablaCategorias,
  type FacturacionAnualResult,
} from '../services/monotributoService'
import { CATEGORIAS_MONOTRIBUTO } from '../../config/monotributo'
import { useCliente } from '../hooks/useCliente'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

export default function MonotributoPage() {
  const [esServicio, setEsServicio] = useState(true)
  const [categoriaActualId, setCategoriaActualId] = useState<string>('')
  const { clienteActivo, setClienteActivo, clientes } = useCliente()

  const comprobantes = useLiveQuery(
    () => clienteActivo?.id ? getComprobantesFlatByCliente(clienteActivo.id) : getAllComprobantesFlat(),
    [clienteActivo?.id],
  )

  const data = useMemo<FacturacionAnualResult | null>(() => {
    if (!comprobantes) return null
    return calcularFacturacionAnualDesde(comprobantes)
  }, [comprobantes])

  const recomendada = useMemo(
    () => data ? obtenerCategoriaRecomendada(data.facturacion) : null,
    [data],
  )

  const categoriaActual = useMemo(
    () => CATEGORIAS_MONOTRIBUTO.find((c) => c.id === categoriaActualId) || null,
    [categoriaActualId],
  )

  const infoCategoriaActual = useMemo(() => {
    if (!data || !categoriaActual) return null
    const pct = Math.round((data.facturacion / categoriaActual.facturacionMax) * 1000) / 10
    const excede = data.facturacion > categoriaActual.facturacionMax
    return { pctUsado: pct, excede }
  }, [data, categoriaActual])

  const tabla = useMemo(
    () => data && recomendada ? getTablaCategorias(data.facturacion, recomendada) : [],
    [data, recomendada],
  )

  const comprobantesOrdenados = useMemo(() => {
    if (!comprobantes) return []
    return [...comprobantes].reverse()
  }, [comprobantes])

  const getCuota = (cat: typeof CATEGORIAS_MONOTRIBUTO[number]) =>
    esServicio ? cat.cuotaServicios : cat.cuotaBienes

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fadeInUp">
      <PageHeader title="Monotributo" subtitle="Calculador de categoría según facturación anual">
        {clientes.length > 0 && (
          <div className="relative">
            <select
              value={clienteActivo?.id ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                const c = clientes.find((cl) => cl.id === id) || null
                setClienteActivo(c)
              }}
              className="appearance-none bg-navy-800 border border-glass-border text-text-primary rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium outline-none transition-all duration-300 cursor-pointer min-w-[200px] hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6">
        {!comprobantes && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <RefreshCw size={32} className="animate-spin mr-3" />
            <p className="text-lg">Cargando comprobantes...</p>
          </div>
        )}

        {data && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Facturación Anual Estimada</p>
                <p className="text-text-primary text-3xl font-bold">
                  ${formatCurrency(data.facturacion)}
                </p>
                <p className="text-text-muted text-xs mt-2">
                  {data.cantidadComprobantes} comprobantes de venta · Últimos 12 meses ({data.desde} a {data.hasta})
                  {data.cantidadComprobantes === 0 && comprobantes && comprobantes.length > 0 && (
                    <span className="text-yellow-400"> · Revisá tipo y categoría de los comprobantes</span>
                  )}
                </p>
              </Card>

              <Card>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Período evaluado</p>
                <p className="text-text-primary text-lg font-semibold">{data.desde} — {data.hasta}</p>
                <p className="text-text-muted text-xs mt-2">
                  Límite máx. Cat. K: ${formatCurrency(CATEGORIAS_MONOTRIBUTO[CATEGORIAS_MONOTRIBUTO.length - 1].facturacionMax)}
                </p>
              </Card>
            </div>

            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-2">Tu categoría actual</p>
                  <div className="relative inline-block">
                    <select
                      value={categoriaActualId}
                      onChange={(e) => setCategoriaActualId(e.target.value)}
                      className="appearance-none bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 pr-10 text-sm font-medium outline-none transition-all duration-300 cursor-pointer min-w-[200px] hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5"
                    >
                      <option value="">Seleccioná tu categoría</option>
                      {CATEGORIAS_MONOTRIBUTO.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label} — Tope: ${formatCurrency(cat.facturacionMax)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {infoCategoriaActual && categoriaActualId && (
                <div className="mt-4">
                  <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        infoCategoriaActual.excede
                          ? 'bg-error'
                          : infoCategoriaActual.pctUsado > 80
                            ? 'bg-yellow-400'
                            : 'bg-teal/60'
                      }`}
                      style={{ width: `${Math.min(infoCategoriaActual.pctUsado, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${
                    infoCategoriaActual.excede
                      ? 'text-error'
                      : infoCategoriaActual.pctUsado > 80
                        ? 'text-yellow-400'
                        : 'text-text-muted'
                  }`}>
                    {infoCategoriaActual.excede
                      ? `Excede el límite (${infoCategoriaActual.pctUsado}%)`
                      : `${infoCategoriaActual.pctUsado}% del límite usado`}
                  </p>
                </div>
              )}
            </Card>

            {infoCategoriaActual?.excede && categoriaActualId && recomendada?.categoria && (
              <div className="bg-error-bg border border-error/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-error text-lg font-semibold mb-1">
                      Superaste el límite de {categoriaActual?.label}
                    </p>
                    <p className="text-error/80 text-sm">
                      Tu facturación anual estimada (${formatCurrency(data.facturacion)}) supera el tope de {categoriaActual?.label} (${formatCurrency(categoriaActual!.facturacionMax)}).
                      Te corresponde recategorizarte a {recomendada.categoria.label}. Recordá que la recategorización es obligatoria cuando la facturación supera el límite de tu categoría.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {infoCategoriaActual && !infoCategoriaActual.excede && infoCategoriaActual.pctUsado > 80 && categoriaActualId && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-lg font-semibold mb-1">
                      Cerca del límite de {categoriaActual?.label}
                    </p>
                    <p className="text-yellow-400/80 text-sm">
                      Usaste el {infoCategoriaActual.pctUsado}% del tope de facturación de {categoriaActual?.label}.
                      Si seguís facturando a este ritmo, podrías superar el límite y necesitar recategorizarte a {recomendada?.categoria?.label || 'una categoría superior'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {recomendada?.excedeLimite && (
              <div className="bg-error-bg border border-error/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-error text-lg font-semibold mb-1">Excede el límite del Monotributo</p>
                    <p className="text-error/80 text-sm">
                      Tu facturación anual estimada (${formatCurrency(data.facturacion)}) supera el límite máximo de la categoría K (${formatCurrency(CATEGORIAS_MONOTRIBUTO[CATEGORIAS_MONOTRIBUTO.length - 1].facturacionMax)}). 
                      Corresponde evaluar la inscripción como Responsable Inscripto en el Régimen General.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {recomendada && !recomendada.excedeLimite && data.cantidadComprobantes > 0 && (
              <Card>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal/20 border border-teal/30 flex items-center justify-center shrink-0">
                    <Scale size={24} className="text-teal" />
                  </div>
                  <div className="flex-1">
                    <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Categoría Recomendada</p>
                    <p className="text-text-primary text-2xl font-bold">
                      {recomendada.categoria?.label || '—'}
                    </p>
                    <p className="text-text-secondary text-sm mt-1">
                      Límite: ${formatCurrency(recomendada.categoria?.facturacionMax || 0)} anual &middot;
                      Usás el {recomendada.pctUsado}% del tope
                    </p>
                    <div className="mt-3 w-full bg-navy-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          recomendada.pctUsado > 90
                            ? 'bg-yellow-400'
                            : recomendada.pctUsado > 70
                              ? 'bg-teal'
                              : 'bg-teal/60'
                        }`}
                        style={{ width: `${Math.min(recomendada.pctUsado, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <span className="text-text-muted text-xs uppercase tracking-wide">Actividad:</span>
                  <button
                    onClick={() => setEsServicio(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      esServicio
                        ? 'bg-teal/20 text-teal border border-teal/30'
                        : 'bg-navy-800 text-text-secondary border border-glass-border hover:text-text-primary'
                    }`}
                  >
                    Servicios
                  </button>
                  <button
                    onClick={() => setEsServicio(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      !esServicio
                        ? 'bg-teal/20 text-teal border border-teal/30'
                        : 'bg-navy-800 text-text-secondary border border-glass-border hover:text-text-primary'
                    }`}
                  >
                    Venta de Bienes
                  </button>
                </div>

                <div className="mt-4 bg-teal/10 border border-teal/20 rounded-xl px-5 py-4">
                  <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Cuota Mensual Estimada</p>
                  <p className="text-teal text-2xl font-bold">
                    ${formatCurrency(getCuota(recomendada.categoria!))}
                  </p>
                  <p className="text-text-muted text-xs mt-1">
                    Incluye impuesto integrado + SIPA + obra social · Valores {new Date().getFullYear()}
                  </p>
                </div>
              </Card>
            )}

            <Card header={<h3 className="text-text-primary font-semibold text-sm">Tabla comparativa de categorías</h3>} padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide">
                      <th className="text-left px-6 py-3 font-medium">Categoría</th>
                      <th className="text-right px-6 py-3 font-medium">Facturación Máx.</th>
                      <th className="text-right px-6 py-3 font-medium">Cuota Bienes</th>
                      <th className="text-right px-6 py-3 font-medium">Cuota Servicios</th>
                      <th className="text-right px-6 py-3 font-medium">Uso del Límite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.map((row) => (
                      <tr
                        key={row.categoria.id}
                        className={`border-b border-glass-border/50 transition-colors ${
                          row.esRecomendada
                            ? 'bg-teal/5 border-teal/30'
                            : 'hover:bg-glass-hover'
                        }`}
                      >
                        <td className="px-6 py-3">
                          <span className="text-text-primary font-medium">{row.categoria.label}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-text-secondary">
                          ${formatCurrency(row.categoria.facturacionMax)}
                        </td>
                        <td className="px-6 py-3 text-right text-text-secondary">
                          ${formatCurrency(row.categoria.cuotaBienes)}
                        </td>
                        <td className="px-6 py-3 text-right text-text-secondary">
                          ${formatCurrency(row.categoria.cuotaServicios)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-navy-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.excede ? 'bg-error' : row.esRecomendada ? 'bg-teal' : 'bg-glass-border'
                                }`}
                                style={{ width: `${Math.min(row.pctUsado, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs ${
                              row.excede ? 'text-error' : row.esRecomendada ? 'text-teal' : 'text-text-muted'
                            }`}>
                              {row.excede ? 'Excede' : `${Math.min(row.pctUsado, 100).toFixed(0)}%`}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card header={<h3 className="text-text-primary font-semibold text-sm">Comprobantes cargados ({comprobantesOrdenados.length})</h3>} padding={false}>
              {comprobantesOrdenados.length === 0 ? (
                <div className="px-6 py-8 text-center text-text-muted text-sm">
                  <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No hay comprobantes en los últimos 12 meses</p>
                  <p className="text-xs mt-1">Cargá comprobantes desde la sección Cargar o Bandeja</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide sticky top-0 bg-navy-900">
                        <th className="text-left px-4 py-3 font-medium">Tipo</th>
                        <th className="text-left px-4 py-3 font-medium">Razón Social</th>
                        <th className="text-right px-4 py-3 font-medium">Neto</th>
                        <th className="text-right px-4 py-3 font-medium">Total</th>
                        <th className="text-left px-4 py-3 font-medium">Categoría</th>
                        <th className="text-left px-4 py-3 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprobantesOrdenados.map((c) => (
                        <tr key={c.id} className="border-b border-glass-border/50 hover:bg-glass-hover transition-colors">
                        <td className="px-4 py-3 text-text-primary text-xs">{c.tipo || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[180px]">
                          {c.razonSocial || '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs text-right">
                          ${formatCurrency(c.netoGravado || 0)}
                        </td>
                        <td className="px-4 py-3 text-text-primary text-xs text-right font-medium">
                          ${formatCurrency(c.total || 0)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{c.categoria || '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{c.fecha || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-5 py-4 text-yellow-300 text-sm">
              <p className="font-medium mb-1">Información importante</p>
              <p>
                Este cálculo es orientativo basado en los comprobantes de venta cargados en el sistema. 
                La categoría sugerida puede variar según superficie afectada, energía eléctrica consumida 
                y alquileres. Valores vigentes a junio 2026. Confirmá siempre tu situación en 
                <a href="https://www.arca.gob.ar" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline ml-1">ARCA</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
