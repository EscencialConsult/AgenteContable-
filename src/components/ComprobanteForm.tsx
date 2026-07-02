import { useState, type FormEvent } from 'react'
import type { Comprobante, Categoria, EstadoComprobante } from '../types/comprobante'
import { CATEGORIA_OPTIONS, ESTADO_OPTIONS } from '../config'
import { parseNumber } from '../utils/format'
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const comprobante: Partial<Comprobante> = {
      ...initial,
      tipo: form.tipo,
      cuit: form.cuit,
      razonSocial: form.razonSocial,
      fecha: form.fecha,
      puntoVenta: parseInt(form.puntoVenta) || 0,
      numero: parseInt(form.numero) || 0,
      condicionIVA: form.condicionIVA,
      netoGravado: parseNumber(form.netoGravado),
      iva: parseNumber(form.iva),
      percepciones: parseNumber(form.percepciones),
      retenciones: parseNumber(form.retenciones),
      total: parseNumber(form.total),
      cae: form.cae,
      fechaVencimiento: form.fechaVencimiento,
      categoria: form.categoria as Categoria,
      estado: form.estado as EstadoComprobante,
      observaciones: form.observaciones,
    }

    onSave(comprobante)
  }

  const inputClass = 'w-full px-3 py-2 bg-navy-800 border border-glass-border rounded-lg text-text-primary text-sm outline-none transition-all duration-200 hover:bg-glass-hover focus:border-teal focus:shadow-[0_0_0_3px_rgba(106,213,203,0.15)]'
  const labelClass = 'block text-text-secondary text-xs font-medium uppercase tracking-wide mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fileName && (
        <div className="px-4 py-3 bg-teal/10 border border-teal/30 rounded-lg text-teal text-sm">
          Archivo: {fileName}
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
