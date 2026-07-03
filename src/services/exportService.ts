import * as XLSX from 'xlsx-js-style'
import type { Comprobante, IVADetalle, BatchItem } from '../types/comprobante'
import { CATEGORIA_LABELS, ALICUOTAS } from '../config'
import type { PreliquidacionResult } from './preliquidacionService'

export { calcularPreliquidacion } from './preliquidacionService'
export type { PreliquidacionResult, ResumenIVA } from './preliquidacionService'

type WorkSheet = XLSX.WorkSheet & {
  '!freeze'?: { xSplit?: number; ySplit?: number; topLeftCell?: string; activePane?: string; state?: string }
}

const COLORS = {
  navy: '3E425B',
  navyDark: '232636',
  teal: '8DDFE4',
  tealLight: 'F2D8F4',
  gray: 'E5E7EB',
  grayLight: 'F8FAFC',
  white: 'F6F7FB',
}

const currencyFormat = '"$"#,##0'
const integerFormat = '#,##0'

function cell(ws: XLSX.WorkSheet, address: string) {
  if (!ws[address]) ws[address] = { t: 's', v: '' }
  return ws[address] as XLSX.CellObject & { s?: unknown; z?: string }
}

function setStyle(ws: XLSX.WorkSheet, address: string, style: unknown) {
  cell(ws, address).s = style
}

function styleRange(ws: XLSX.WorkSheet, range: string, style: unknown) {
  const decoded = XLSX.utils.decode_range(range)
  for (let row = decoded.s.r; row <= decoded.e.r; row++) {
    for (let col = decoded.s.c; col <= decoded.e.c; col++) {
      setStyle(ws, XLSX.utils.encode_cell({ r: row, c: col }), style)
    }
  }
}

function formatRange(ws: XLSX.WorkSheet, range: string, format: string) {
  const decoded = XLSX.utils.decode_range(range)
  for (let row = decoded.s.r; row <= decoded.e.r; row++) {
    for (let col = decoded.s.c; col <= decoded.e.c; col++) {
      cell(ws, XLSX.utils.encode_cell({ r: row, c: col })).z = format
    }
  }
}

function applyTableStyle(ws: WorkSheet, headerRange: string, bodyRange: string, currencyRange?: string) {
  styleRange(ws, headerRange, {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } },
    font: { bold: true, color: { rgb: COLORS.white } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.navy } },
      bottom: { style: 'thin', color: { rgb: COLORS.navy } },
    },
  })
  styleRange(ws, bodyRange, {
    border: {
      bottom: { style: 'thin', color: { rgb: COLORS.gray } },
    },
  })
  if (currencyRange) formatRange(ws, currencyRange, currencyFormat)
}

function getSignoFiscal(comprobante: Comprobante): 1 | -1 {
  if (comprobante.signoFiscal) return comprobante.signoFiscal
  return comprobante.tipo.toUpperCase().includes('NOTA DE CREDITO') ||
    comprobante.categoria === 'nota_credito'
    ? -1
    : 1
}

function getLineasIVA(comprobante: Comprobante): IVADetalle[] {
  if (comprobante.ivaDetalle?.length) return comprobante.ivaDetalle

  return [{
    alicuota: comprobante.iva === 0 ? '0%' : inferAlicuota(comprobante),
    neto: comprobante.netoGravado || 0,
    iva: comprobante.iva || 0,
  }]
}

function inferAlicuota(comprobante: Comprobante): string {
  if (!comprobante.netoGravado || !comprobante.iva) return '0%'

  const ratio = comprobante.iva / comprobante.netoGravado
  const match = ALICUOTAS.find((alicuota) => {
    const value = parseFloat(alicuota) / 100
    return Math.abs(ratio - value) < 0.03
  })

  return match || '21%'
}

export function exportToExcel(data: PreliquidacionResult): void {
  const wb = XLSX.utils.book_new()

  const resumenData = [
    ['Preliquidacion IVA', '', '', '', '', '', ''],
    ['Periodo', data.periodo, 'Generado', new Date().toLocaleDateString('es-AR'), '', '', ''],
    [],
    ['Comprobantes', 'Incluidos', 'Observados', 'Pendientes', 'Sin clasificar', 'Saldo tecnico', 'Saldo estimado'],
    [
      data.comprobantes.length,
      data.comprobantesIncluidos,
      data.comprobantesObservados,
      data.comprobantesPendientes,
      data.comprobantesSinClasificar,
      data.saldoTecnico,
      data.saldoEstimado,
    ],
    [],
    ['Resumen de IVA', '', '', '', '', '', ''],
    [
      'Alicuota',
      'Neto Ventas',
      'IVA Debito',
      'Neto Compras Computable',
      'IVA Credito Computable',
      'Neto No Computable',
      'IVA No Computable',
    ],
    ...data.resumenPorAlicuota.map((r) => [
      r.alicuota,
      r.netoVentas,
      r.ivaVentas,
      r.netoComprasComputable,
      r.ivaComprasComputable,
      r.netoComprasNoComputable,
      r.ivaComprasNoComputable,
    ]),
    [],
    ['Totales', data.totalVentasNeto, data.totalVentasIVA, data.totalComprasNeto, data.totalComprasIVA, data.totalComprasNoComputableNeto, data.totalComprasNoComputableIVA],
    [],
    ['Otros conceptos', 'Importe'],
    ['No gravado', data.noGravado],
    ['Exento', data.exento],
    ['Percepciones', data.percepciones],
    ['Retenciones', data.retenciones],
    ['Saldo tecnico', data.saldoTecnico],
    ['Saldo estimado', data.saldoEstimado],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData) as WorkSheet
  wsResumen['!cols'] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
  ]
  wsResumen['!merges'] = [
    XLSX.utils.decode_range('A1:G1'),
    XLSX.utils.decode_range('A7:G7'),
  ]
  wsResumen['!freeze'] = { ySplit: 8, topLeftCell: 'A9', activePane: 'bottomLeft', state: 'frozen' }
  wsResumen['!autofilter'] = { ref: `A8:G${8 + data.resumenPorAlicuota.length}` }

  styleRange(wsResumen, 'A1:G1', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.navyDark } },
    font: { bold: true, sz: 18, color: { rgb: COLORS.white } },
    alignment: { horizontal: 'center', vertical: 'center' },
  })
  styleRange(wsResumen, 'A2:D2', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.grayLight } },
    font: { bold: true, color: { rgb: COLORS.navyDark } },
  })
  styleRange(wsResumen, 'A4:G4', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.tealLight } },
    font: { bold: true, color: { rgb: COLORS.navyDark } },
    alignment: { horizontal: 'center' },
  })
  styleRange(wsResumen, 'A5:G5', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.grayLight } },
    font: { bold: true, sz: 12 },
    alignment: { horizontal: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: COLORS.gray } } },
  })
  styleRange(wsResumen, 'A7:G7', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.teal } },
    font: { bold: true, color: { rgb: COLORS.white } },
    alignment: { horizontal: 'center' },
  })
  applyTableStyle(
    wsResumen,
    'A8:G8',
    `A9:G${9 + data.resumenPorAlicuota.length}`,
    `B9:G${10 + data.resumenPorAlicuota.length}`,
  )
  const totalRow = 10 + data.resumenPorAlicuota.length
  styleRange(wsResumen, `A${totalRow}:G${totalRow}`, {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.gray } },
    font: { bold: true, color: { rgb: COLORS.navyDark } },
    border: { top: { style: 'thin', color: { rgb: COLORS.navy } } },
  })
  const otrosHeaderRow = totalRow + 2
  styleRange(wsResumen, `A${otrosHeaderRow}:B${otrosHeaderRow}`, {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } },
    font: { bold: true, color: { rgb: COLORS.white } },
  })
  formatRange(wsResumen, 'A5:C5', integerFormat)
  formatRange(wsResumen, 'D5:G5', currencyFormat)
  formatRange(wsResumen, `B${otrosHeaderRow + 1}:B${otrosHeaderRow + 6}`, currencyFormat)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen IVA')

  const detalleData = [
    [
      'Tipo',
      'CUIT',
      'Razon Social',
      'Fecha',
      'Neto Gravado',
      'IVA',
      'No Gravado',
      'Exento',
      'Percepciones',
      'Retenciones',
      'Total',
      'Categoria',
      'Estado Revision',
      'Nivel Validacion',
      'Tratamiento IVA',
      'Afecta Preliquidacion',
      'Moneda',
      'Tipo Cambio',
      'Neto Original',
      'IVA Original',
      'Total Original',
      'Total ARS',
      'CAE',
    ],
    ...data.comprobantes.map((c) => [
      c.tipo,
      c.cuit,
      c.razonSocial,
      c.fecha,
      c.netoGravado,
      c.iva,
      c.noGravado || 0,
      c.exento || 0,
      c.percepciones,
      c.retenciones,
      c.total,
      CATEGORIA_LABELS[c.categoria] || c.categoria,
      c.estadoRevision || c.estado,
      c.nivelValidacion || 'success',
      c.clasificacionFiscal?.tratamientoIVA?.replace(/_/g, ' ') || '',
      c.clasificacionFiscal?.afectaPreliquidacion === false ? 'No' : 'Si',
      c.moneda || 'ARS',
      c.tipoCambio || '',
      c.netoGravadoMonedaOriginal || '',
      c.ivaMonedaOriginal || '',
      c.totalMonedaOriginal || '',
      c.totalPesos || c.total,
      c.cae,
    ]),
  ]

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData) as WorkSheet
  wsDetalle['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ]
  wsDetalle['!freeze'] = { ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
  wsDetalle['!autofilter'] = { ref: `A1:W${Math.max(1, detalleData.length)}` }
  applyTableStyle(wsDetalle, 'A1:W1', `A2:W${Math.max(2, detalleData.length)}`, `E2:V${Math.max(2, detalleData.length)}`)
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Comprobantes')

  const ivaDetalleData = [
    ['Comprobante', 'CUIT', 'Fecha', 'Categoria', 'Alicuota', 'Neto', 'IVA'],
    ...data.comprobantes.flatMap((c) =>
      getLineasIVA(c).map((linea) => [
        `${c.tipo} ${c.puntoVenta}-${c.numero}`,
        c.cuit,
        c.fecha,
        CATEGORIA_LABELS[c.categoria] || c.categoria,
        linea.alicuota,
        linea.neto * getSignoFiscal(c),
        linea.iva * getSignoFiscal(c),
      ]),
    ),
  ]
  const wsIvaDetalle = XLSX.utils.aoa_to_sheet(ivaDetalleData) as WorkSheet
  wsIvaDetalle['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ]
  wsIvaDetalle['!freeze'] = { ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
  wsIvaDetalle['!autofilter'] = { ref: `A1:G${Math.max(1, ivaDetalleData.length)}` }
  applyTableStyle(wsIvaDetalle, 'A1:G1', `A2:G${Math.max(2, ivaDetalleData.length)}`, `F2:G${Math.max(2, ivaDetalleData.length)}`)
  XLSX.utils.book_append_sheet(wb, wsIvaDetalle, 'Detalle IVA')

  const fileName = `preliquidacion_${data.periodo.replace(/[/\s]/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName, { cellStyles: true, bookSST: true })
}

export function exportBatchReport(batchResults: BatchItem[], loteId: number): void {
  const wb = XLSX.utils.book_new()

  const summary = {
    total: batchResults.length,
    procesado: batchResults.filter((r) => r.status === 'procesado').length,
    duplicado: batchResults.filter((r) => r.status === 'duplicado').length,
    error: batchResults.filter((r) => r.status === 'error' || r.status === 'sin_texto').length,
  }

  const resumenData = [
    ['Reporte de Lote', '', ''],
    ['Lote ID', loteId, ''],
    ['Fecha', new Date().toLocaleDateString('es-AR'), ''],
    [],
    ['Estado', 'Cantidad', ''],
    ['Válidos', summary.procesado, ''],
    ['Duplicados', summary.duplicado, ''],
    ['Errores', summary.error, ''],
    ['Total', summary.total, ''],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData) as WorkSheet
  wsResumen['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }]
  styleRange(wsResumen, 'A1:C1', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.navyDark } },
    font: { bold: true, sz: 14, color: { rgb: COLORS.white } },
  })
  styleRange(wsResumen, 'A5:B5', {
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } },
    font: { bold: true, color: { rgb: COLORS.white } },
  })
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  const detalleData = [
    ['Archivo', 'Estado', 'Mensaje', 'Tipo', 'CUIT', 'Razón Social', 'Fecha', 'Neto Gravado', 'IVA', 'Total'],
    ...batchResults.map((r) => [
      r.fileName,
      r.status,
      r.message || '',
      r.comprobante?.tipo || '',
      r.comprobante?.cuit || '',
      r.comprobante?.razonSocial || '',
      r.comprobante?.fecha || '',
      r.comprobante?.netoGravado || '',
      r.comprobante?.iva || '',
      r.comprobante?.total || '',
    ]),
  ]

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData) as WorkSheet
  wsDetalle['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ]
  wsDetalle['!freeze'] = { ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
  wsDetalle['!autofilter'] = { ref: `A1:J${Math.max(1, detalleData.length)}` }
  applyTableStyle(wsDetalle, 'A1:J1', `A2:J${Math.max(2, detalleData.length)}`, `H2:J${Math.max(2, detalleData.length)}`)
  
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Archivos')

  const fileName = `reporte_lote_${loteId}.xlsx`
  XLSX.writeFile(wb, fileName, { cellStyles: true, bookSST: true })
}
