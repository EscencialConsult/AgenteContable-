import * as XLSX from 'xlsx'
import type { Comprobante } from '../types/comprobante'
import { CATEGORIA_LABELS, ALICUOTAS, ALICUOTA_TOLERANCE } from '../config'

export interface ResumenIVA {
  alicuota: string
  netoVentas: number
  ivaVentas: number
  netoCompras: number
  ivaCompras: number
}

export interface PreliquidacionResult {
  periodo: string
  resumenPorAlicuota: ResumenIVA[]
  totalVentasNeto: number
  totalVentasIVA: number
  totalComprasNeto: number
  totalComprasIVA: number
  percepciones: number
  retenciones: number
  saldoTecnico: number
  comprobantes: Comprobante[]
}

export function calcularPreliquidacion(
  comprobantes: Comprobante[],
  periodo: string,
): PreliquidacionResult {
  const ventas = comprobantes.filter(
    (c) => c.categoria === 'venta' || c.categoria === 'nota_credito' || c.categoria === 'nota_debito',
  )

  const compras = comprobantes.filter(
    (c) =>
      c.categoria === 'compra' ||
      c.categoria === 'gasto_deducible' ||
      c.categoria === 'gasto_no_computable',
  )

  const percepciones = comprobantes
    .filter((c) => c.categoria === 'percepcion')
    .reduce((sum, c) => sum + c.total, 0)

  const retenciones = comprobantes
    .filter((c) => c.categoria === 'retencion')
    .reduce((sum, c) => sum + c.total, 0)

  const resumenPorAlicuota: ResumenIVA[] = ALICUOTAS.map((alicuota) => {
    const alValue = parseFloat(alicuota)

    const vtas = ventas.filter((c) => {
      if (alValue === 0) return c.iva === 0
      const diff = Math.abs((c.netoGravado > 0 ? c.iva / c.netoGravado : 0) - alValue / 100)
      return diff < ALICUOTA_TOLERANCE
    })

    const comps = compras.filter((c) => {
      if (alValue === 0) return c.iva === 0
      const diff = Math.abs((c.netoGravado > 0 ? c.iva / c.netoGravado : 0) - alValue / 100)
      return diff < ALICUOTA_TOLERANCE
    })

    return {
      alicuota,
      netoVentas: vtas.reduce((s, c) => s + c.netoGravado, 0),
      ivaVentas: vtas.reduce((s, c) => s + c.iva, 0),
      netoCompras: comps.reduce((s, c) => s + c.netoGravado, 0),
      ivaCompras: comps.reduce((s, c) => s + c.iva, 0),
    }
  })

  const totalVentasNeto = resumenPorAlicuota.reduce((s, r) => s + r.netoVentas, 0)
  const totalVentasIVA = resumenPorAlicuota.reduce((s, r) => s + r.ivaVentas, 0)
  const totalComprasNeto = resumenPorAlicuota.reduce((s, r) => s + r.netoCompras, 0)
  const totalComprasIVA = resumenPorAlicuota.reduce((s, r) => s + r.ivaCompras, 0)

  const saldoTecnico = totalVentasIVA - totalComprasIVA

  return {
    periodo,
    resumenPorAlicuota,
    totalVentasNeto,
    totalVentasIVA,
    totalComprasNeto,
    totalComprasIVA,
    percepciones,
    retenciones,
    saldoTecnico,
    comprobantes,
  }
}

export function exportToExcel(data: PreliquidacionResult): void {
  const wb = XLSX.utils.book_new()

  const resumenData = [
    ['Período:', data.periodo],
    [],
    ['Resumen de IVA', '', '', '', ''],
    ['Alícuota', 'Neto Ventas', 'IVA Ventas', 'Neto Compras', 'IVA Compras'],
    ...data.resumenPorAlicuota.map((r) => [
      r.alicuota,
      r.netoVentas,
      r.ivaVentas,
      r.netoCompras,
      r.ivaCompras,
    ]),
    [],
    [
      'Totales',
      data.totalVentasNeto,
      data.totalVentasIVA,
      data.totalComprasNeto,
      data.totalComprasIVA,
    ],
    [],
    ['Percepciones:', data.percepciones],
    ['Retenciones:', data.retenciones],
    ['Saldo Técnico (IVA Débito - IVA Crédito):', data.saldoTecnico],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)

  const colWidths = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ]
  wsResumen['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen IVA')

  const detalleData = [
    ['Tipo', 'CUIT', 'Razón Social', 'Fecha', 'Neto Gravado', 'IVA', 'Percepciones', 'Retenciones', 'Total', 'Categoría', 'Estado', 'CAE'],
    ...data.comprobantes.map((c) => [
      c.tipo,
      c.cuit,
      c.razonSocial,
      c.fecha,
      c.netoGravado,
      c.iva,
      c.percepciones,
      c.retenciones,
      c.total,
      CATEGORIA_LABELS[c.categoria] || c.categoria,
      c.estado,
      c.cae,
    ]),
  ]

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)
  const detalleColWidths = [
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
  ]
  wsDetalle['!cols'] = detalleColWidths

  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Comprobantes')

  const fileName = `preliquidacion_${data.periodo.replace(/[/\s]/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
