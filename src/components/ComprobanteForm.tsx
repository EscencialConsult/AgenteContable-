import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle, CircleDollarSign, ReceiptText, ShieldCheck } from 'lucide-react'
import type { Comprobante, Categoria, EstadoComprobante } from '../types/comprobante'
import { ALICUOTAS, CATEGORIA_LABELS, CATEGORIA_OPTIONS, ESTADO_OPTIONS } from '../config'
import { clasificarFiscalmente, getSignoFiscalPorComprobante } from '../services/fiscalClassifierService'
import { validarReglasContables } from '../services/validatorService'
import { formatCurrency, parseNumber } from '../utils/format'
import Button from './ui/Button'

interface Props {
  initial: Partial<Comprobante>
  onSave: (comprobante: Partial<Comprobante>) => void
  onCancel: () => void
  fileName?: string
}

export default function ComprobanteForm({ initial, onSave, onCancel, fileName }: Props) {
  const [form, setForm] = useState({
    tipo: initial.tipo || '',
    cuit: initial.cuit || '',
    razonSocial: initial.razonSocial || '',
    fecha: initial.fecha || '',
    puntoVenta: initial.puntoVenta?.toString() || '',
    numero: initial.numero?.toString() || '',
    condicionIVA: initial.condicionIVA || '',
    netoGravado: initial.netoGravado?.toString() || '',
    iva: initial.iva?.toString() || '',
    alicuota: initial.ivaDetalle?.[0]?.alicuota || (initial.iva ? '21%' : '0%'),
    noGravado: initial.noGravado?.toString() || '',
    exento: initial.exento?.toString() || '',
    percepciones: initial.percepciones?.toString() || '',
    retenciones: initial.retenciones?.toString() || '',
    total: initial.total?.toString() || '',
    cae: initial.cae || '',
    fechaVencimiento: initial.fechaVencimiento || '',
    categoria: initial.categoria || 'sin_clasificar',
    estado: initial.estado || 'pendiente',
    observaciones: initial.observaciones || '',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const draft = useMemo<Partial<Comprobante>>(() => {
    const netoGravado = parseNumber(form.netoGravado)
    const iva = parseNumber(form.iva)
    const noGravado = parseNumber(form.noGravado)
    const exento = parseNumber(form.exento)
    const percepciones = parseNumber(form.percepciones)
    const retenciones = parseNumber(form.retenciones)

    const draftComprobante: Partial<Comprobante> = {
      ...initial,
      tipo: form.tipo,
      cuit: form.cuit,
      razonSocial: form.razonSocial,
      fecha: form.fecha,
      puntoVenta: parseInt(form.puntoVenta) || 0,
      numero: parseInt(form.numero) || 0,
      condicionIVA: form.condicionIVA,
      netoGravado,
      iva,
      noGravado,
      exento,
      ivaDetalle: [{
        alicuota: form.alicuota,
        neto: netoGravado,
        iva,
      }],
      percepciones,
      retenciones,
      impuestosDetalle: [
        ...(percepciones
          ? [{
              tipo: 'percepcion' as const,
              descripcion: 'Percepciones registradas',
              importe: percepciones,
            }]
          : []),
        ...(retenciones
          ? [{
              tipo: 'retencion' as const,
              descripcion: 'Retenciones registradas',
              importe: retenciones,
            }]
          : []),
      ],
      total: parseNumber(form.total),
      cae: form.cae,
      fechaVencimiento: form.fechaVencimiento,
      categoria: form.categoria as Categoria,
      estado: form.estado as EstadoComprobante,
      estadoRevision: form.estado as Comprobante['estadoRevision'],
      observaciones: form.observaciones,
    }

    return {
      ...draftComprobante,
      signoFiscal: getSignoFiscalPorComprobante(draftComprobante),
    }
  }, [form, initial])

  const fiscal = useMemo(() => clasificarFiscalmente(draft), [draft])
  const reglas = useMemo(() => validarReglasContables({
    ...draft,
    categoria: fiscal.categoria,
    clasificacionFiscal: fiscal,
  }), [draft, fiscal])
  const fieldWarnings = useMemo(() =>
    (draft.fieldWarnings || []).filter((warning) => {
      switch (warning.field) {
        case 'tipo':
          return !form.tipo || ['FACTURA', 'DESCONOCIDO'].includes(form.tipo.trim().toUpperCase())
        case 'razonSocial':
          return !form.razonSocial.trim()
        case 'cuit':
          return form.cuit.replace(/\D/g, '').length !== 11
        case 'fecha':
          return !form.fecha.trim()
        case 'total':
          return parseNumber(form.total) <= 0
        case 'puntoVenta':
          return (parseInt(form.puntoVenta) || 0) <= 0
        case 'numero':
          return (parseInt(form.numero) || 0) <= 0
        case 'cae': {
          const digits = form.cae.replace(/\D/g, '')
          return digits.length === 0 || digits.length !== 14
        }
        case 'fechaVencimiento':
          return !form.fechaVencimiento.trim()
        case 'categoria':
          return form.categoria === 'sin_clasificar'
        default:
          return true
      }
    }),
  [draft.fieldWarnings, form])
  const faltantes = useMemo(() => {
    const fields = [
      ['Tipo', form.tipo],
      ['CUIT', form.cuit],
      ['Razon social', form.razonSocial],
      ['Fecha', form.fecha],
      ['Total', form.total],
    ]
    if (fiscal.requierePuntoVentaNumero) {
      fields.push(['Punto de venta', form.puntoVenta], ['Numero', form.numero])
    }
    if (fiscal.requiereCAE) fields.push(['CAE', form.cae])
    return fields.filter(([, value]) => !String(value || '').trim()).map(([label]) => label)
  }, [fiscal, form])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave(draft)
  }

  const inputClass = 'w-full px-3 py-2 bg-navy-800 border border-glass-border rounded-xl text-text-primary text-sm outline-none transition-all duration-300 cursor-pointer hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5'
  const labelClass = 'block text-text-secondary text-xs font-medium uppercase tracking-wide mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fileName && (
        <div className="px-4 py-3 bg-teal/10 border border-teal/30 rounded-lg text-teal text-sm">
          Archivo: {fileName}
        </div>
      )}

      <div className="border border-glass-border rounded-lg bg-navy-900/70 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
          <div className="p-4 border-b lg:border-b-0 lg:border-r border-glass-border">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-text-muted text-[11px] uppercase tracking-wide mb-1">Lectura fiscal</p>
                <div className="flex items-center gap-2 text-text-primary text-sm font-semibold">
                  <ShieldCheck size={16} className="text-teal" />
                  {CATEGORIA_LABELS[fiscal.categoria] || fiscal.categoria}
                </div>
              </div>
              <span className="px-2 py-1 rounded-md bg-glass border border-glass-border text-text-secondary text-[11px]">
                {Math.round(fiscal.confianza * 100)}% confianza
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="px-3 py-2 rounded-md bg-navy-800 border border-glass-border">
                <p className="text-text-muted mb-0.5">Tratamiento IVA</p>
                <p className="text-text-primary">{fiscal.tratamientoIVA.replace(/_/g, ' ')}</p>
              </div>
              <div className="px-3 py-2 rounded-md bg-navy-800 border border-glass-border">
                <p className="text-text-muted mb-0.5">Total leido</p>
                <p className="text-text-primary">${formatCurrency(parseNumber(form.total))}</p>
              </div>
            </div>
            {draft.moneda && draft.moneda !== 'ARS' && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="px-3 py-2 rounded-md bg-navy-800 border border-glass-border">
                  <p className="text-text-muted mb-0.5">Moneda original</p>
                  <p className="text-text-primary">
                    {draft.moneda} {formatCurrency(draft.totalMonedaOriginal || 0)}
                  </p>
                </div>
                <div className="px-3 py-2 rounded-md bg-navy-800 border border-glass-border">
                  <p className="text-text-muted mb-0.5">Tipo cambio</p>
                  <p className="text-text-primary">{draft.tipoCambio?.toFixed(6) || '—'}</p>
                </div>
              </div>
            )}
            {fiscal.motivos.length > 0 && (
              <p className="text-text-secondary text-xs mt-3">{fiscal.motivos[0]}</p>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-text-muted text-[11px] uppercase tracking-wide mb-2">Correccion rapida</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['venta', 'Venta', CircleDollarSign],
                  ['compra', 'Compra', ReceiptText],
                  ['gasto_deducible', 'Gasto', ReceiptText],
                  ['gasto_no_computable', 'No computable', AlertTriangle],
                ].map(([value, label, Icon]) => (
                  <button
                    key={value as string}
                    type="button"
                    onClick={() => handleChange('categoria', value as string)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-teal/40 ${
                      form.categoria === value
                        ? 'bg-teal/15 border-teal/40 text-teal'
                        : 'bg-navy-800 border-glass-border text-text-secondary hover:bg-glass-hover hover:text-text-primary'
                    }`}
                  >
                    <Icon size={14} />
                    {label as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {faltantes.length === 0 && reglas.length === 0 ? (
                <div className="flex items-center gap-2 text-teal text-xs">
                  <CheckCircle size={14} />
                  Lectura lista para guardar
                </div>
              ) : (
                <>
                  {fieldWarnings.length > 0 && (
                    <div className="px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                      Campos a revisar: {fieldWarnings.map((warning) => warning.label).join(', ')}
                    </div>
                  )}
                  {faltantes.length > 0 && (
                    <div className="px-3 py-2 rounded-md bg-error-bg border border-error/30 text-error text-xs">
                      Faltan: {faltantes.join(', ')}
                    </div>
                  )}
                  {reglas.slice(0, 3).map((regla) => (
                    <div
                      key={regla.tipo}
                      className={`px-3 py-2 rounded-md border text-xs ${
                        regla.nivel === 'error'
                          ? 'bg-error-bg border-error/30 text-error'
                          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                      }`}
                    >
                      {regla.mensaje}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {fieldWarnings.length > 0 && (
        <div className="border border-yellow-500/30 rounded-lg bg-yellow-500/10 p-4">
          <p className="text-yellow-400 text-xs font-medium uppercase tracking-wide mb-2">
            Campos inferidos con baja confianza
          </p>
          <div className="space-y-2">
            {fieldWarnings.map((warning) => (
              <div key={`${warning.field}-${warning.message}`} className="text-sm">
                <p className="text-text-primary font-medium">{warning.label}</p>
                <p className="text-text-secondary text-xs">{warning.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Tipo de Comprobante</label>
          <input
            className={inputClass}
            value={form.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            placeholder="Factura A, B, C, etc."
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>CUIT</label>
          <input
            className={inputClass}
            value={form.cuit}
            onChange={(e) => handleChange('cuit', e.target.value)}
            placeholder="20-12345678-9"
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Razón Social</label>
          <input
            className={inputClass}
            value={form.razonSocial}
            onChange={(e) => handleChange('razonSocial', e.target.value)}
            placeholder="Nombre del emisor"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Fecha de Emisión</label>
          <input
            className={inputClass}
            value={form.fecha}
            onChange={(e) => handleChange('fecha', e.target.value)}
            placeholder="DD/MM/AAAA"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Fecha de Vencimiento</label>
          <input
            className={inputClass}
            value={form.fechaVencimiento}
            onChange={(e) => handleChange('fechaVencimiento', e.target.value)}
            placeholder="DD/MM/AAAA"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Punto de Venta</label>
          <input
            className={inputClass}
            value={form.puntoVenta}
            onChange={(e) => handleChange('puntoVenta', e.target.value)}
            placeholder="0004"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Número</label>
          <input
            className={inputClass}
            value={form.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
            placeholder="00000001"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Condición frente al IVA</label>
          <input
            className={inputClass}
            value={form.condicionIVA}
            onChange={(e) => handleChange('condicionIVA', e.target.value)}
            placeholder="Responsable Inscripto"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>CAE</label>
          <input
            className={inputClass}
            value={form.cae}
            onChange={(e) => handleChange('cae', e.target.value)}
            placeholder="Código de Autorización Electrónico"
          />
        </div>
        <div>
          <label className={labelClass}>Neto Gravado</label>
          <input
            className={inputClass}
            value={form.netoGravado}
            onChange={(e) => handleChange('netoGravado', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>IVA</label>
          <input
            className={inputClass}
            value={form.iva}
            onChange={(e) => handleChange('iva', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Alicuota IVA</label>
          <select
            className={inputClass}
            value={form.alicuota}
            onChange={(e) => handleChange('alicuota', e.target.value)}
          >
            {ALICUOTAS.map((alicuota) => (
              <option key={alicuota} value={alicuota} className="bg-navy-800">
                {alicuota}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>No Gravado</label>
          <input
            className={inputClass}
            value={form.noGravado}
            onChange={(e) => handleChange('noGravado', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Exento</label>
          <input
            className={inputClass}
            value={form.exento}
            onChange={(e) => handleChange('exento', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Percepciones</label>
          <input
            className={inputClass}
            value={form.percepciones}
            onChange={(e) => handleChange('percepciones', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Retenciones</label>
          <input
            className={inputClass}
            value={form.retenciones}
            onChange={(e) => handleChange('retenciones', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Total</label>
          <input
            className={inputClass}
            value={form.total}
            onChange={(e) => handleChange('total', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Categoría</label>
            <select
              className={inputClass}
              value={form.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
            >
              {CATEGORIA_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-navy-800">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass}
              value={form.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
            >
              {ESTADO_OPTIONS.map((est) => (
                <option key={est.value} value={est.value} className="bg-navy-800">
                  {est.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Observaciones</label>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.observaciones}
            onChange={(e) => handleChange('observaciones', e.target.value)}
            placeholder="Notas sobre el comprobante"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">
          Guardar Comprobante
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
