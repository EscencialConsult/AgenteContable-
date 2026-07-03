import * as XLSX from 'xlsx-js-style'
import type { Comprobante, IVADetalle } from '../types/comprobante'
import { CATEGORIA_LABELS, ALICUOTAS } from '../config'

type WorkSheet = XLSX.WorkSheet & {
  '!freeze'?: { xSplit?: number; ySplit?: number; topLeftCell?: string; activePane?: string; state?: string }
}

const COLORS = {
  navy: '1F2937',
  navyDark: '111827',
  teal: '14B8A6',
  tealLight: 'CCFBF1',
  gray: 'E5E7EB',
  grayLight: 'F8FAFC',
  white: 'FFFFFF',
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

export interface ResumenIVA {
  alicuota: string
  netoVentas: number
  ivaVentas: number
  netoComprasComputable: number
  ivaComprasComputable: number
  netoComprasNoComputable: number
  ivaComprasNoComputable: number
}

export interface PreliquidacionResult {
  periodo: string
  resumenPorAlicuota: ResumenIVA[]
  totalVentasNeto: number
  totalVentasIVA: number
  totalComprasNeto: number
  totalComprasIVA: number
  totalComprasNoComputableNeto: number
  totalComprasNoComputableIVA: number
  noGravado: number
  exento: number
  percepciones: number
  retenciones: number
  saldoTecnico: number
  saldoEstimado: number
  comprobantesComputables: number
  comprobantesObservados: number
  comprobantes: Comprobante[]
}

function getSignoFiscal(comprobante: Comprobante): 1 | -1 {
  if (comprobante.signoFiscal) return comprobante.signoFiscal
  return comprobante.categoria === 'nota_credito' ? -1 : 1
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

function isVenta(comprobante: Comprobante): boolean {
  return ['venta', 'nota_credito', 'nota_debito'].includes(comprobante.categoria)
}

function isCompra(comprobante: Comprobante): boolean {
  return ['compra', 'gasto_deducible', 'gasto_no_computable'].includes(comprobante.categoria)
}

function isCompraComputable(comprobante: Comprobante): boolean {
  return ['compra', 'gasto_deducible'].includes(comprobante.categoria)
}

function isObservado(comprobante: Comprobante): boolean {
  return (comprobante.nivelValidacion || 'success') === 'error' ||
    (comprobante.estadoRevision || comprobante.estado) === 'observado'
}

export function calcularPreliquidacion(
  comprobantes: Comprobante[],
  periodo: string,
): PreliquidacionResult {
  const resumenPorAlicuota: ResumenIVA[] = ALICUOTAS.map((alicuota) => ({
    alicuota,
    netoVentas: 0,
    ivaVentas: 0,
    netoComprasComputable: 0,
    ivaComprasComputable: 0,
    netoComprasNoComputable: 0,
    ivaComprasNoComputable: 0,
  }))

  const getResumen = (alicuota: string) => {
    const existing = resumenPorAlicuota.find((r) => r.alicuota === alicuota)
    if (existing) return existing

    const created: ResumenIVA = {
      alicuota,
      netoVentas: 0,
      ivaVentas: 0,
      netoComprasComputable: 0,
      ivaComprasComputable: 0,
      netoComprasNoComputable: 0,
      ivaComprasNoComputable: 0,
    }
    resumenPorAlicuota.push(created)
    return created
  }

  let noGravado = 0
  let exento = 0
  let percepciones = 0
  let retenciones = 0

  for (const comprobante of comprobantes) {
    const signo = getSignoFiscal(comprobante)

    noGravado += (comprobante.noGravado || 0) * signo
    exento += (comprobante.exento || 0) * signo

    const percepcionesComprobante =
      comprobante.impuestosDetalle
        ?.filter((i) => i.tipo === 'percepcion')
        .reduce((sum, i) => sum + i.importe, 0) ?? comprobante.percepciones
    const retencionesComprobante =
      comprobante.impuestosDetalle
        ?.filter((i) => i.tipo === 'retencion')
        .reduce((sum, i) => sum + i.importe, 0) ?? comprobante.retenciones

    percepciones += percepcionesComprobante * signo
    retenciones += retencionesComprobante * signo

    for (const linea of getLineasIVA(comprobante)) {
      const resumen = getResumen(linea.alicuota)
      const neto = linea.neto * signo
      const iva = linea.iva * signo

      if (isVenta(comprobante)) {
        resumen.netoVentas += neto
        resumen.ivaVentas += iva
      } else if (isCompra(comprobante)) {
        if (isCompraComputable(comprobante)) {
          resumen.netoComprasComputable += neto
          resumen.ivaComprasComputable += iva
        } else {
          resumen.netoComprasNoComputable += neto
          resumen.ivaComprasNoComputable += iva
        }
      }
    }
  }

  const totalVentasNeto = resumenPorAlicuota.reduce((s, r) => s + r.netoVentas, 0)
  const totalVentasIVA = resumenPorAlicuota.reduce((s, r) => s + r.ivaVentas, 0)
  const totalComprasNeto = resumenPorAlicuota.reduce((s, r) => s + r.netoComprasComputable, 0)
  const totalComprasIVA = resumenPorAlicuota.reduce((s, r) => s + r.ivaComprasComputable, 0)
  const totalComprasNoComputableNeto = resumenPorAlicuota.reduce((s, r) => s + r.netoComprasNoComputable, 0)
  const totalComprasNoComputableIVA = resumenPorAlicuota.reduce((s, r) => s + r.ivaComprasNoComputable, 0)
  const saldoTecnico = totalVentasIVA - totalComprasIVA
  const saldoEstimado = saldoTecnico - percepciones - retenciones

  return {
    periodo,
    resumenPorAlicuota,
    totalVentasNeto,
    totalVentasIVA,
    totalComprasNeto,
    totalComprasIVA,
    totalComprasNoComputableNeto,
    totalComprasNoComputableIVA,
    noGravado,
    exento,
    percepciones,
    retenciones,
    saldoTecnico,
    saldoEstimado,
    comprobantesComputables: comprobantes.filter((c) => !isObservado(c)).length,
    comprobantesObservados: comprobantes.filter(isObservado).length,
    comprobantes,
  }
}

export function exportToExcel(data: PreliquidacionResult): void {
  const wb = XLSX.utils.book_new()

  const resumenData = [
    ['Preliquidacion IVA', '', '', '', '', '', ''],
    ['Periodo', data.periodo, 'Generado', new Date().toLocaleDateString('es-AR'), '', '', ''],
    [],
    ['Comprobantes', 'Computables', 'Observados', 'Saldo tecnico', 'Saldo estimado', 'IVA compras', 'IVA ventas'],
    [
      data.comprobantes.length,
      data.comprobantesComputables,
      data.comprobantesObservados,
      data.saldoTecnico,
      data.saldoEstimado,
      data.totalComprasIVA,
      data.totalVentasIVA,
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
  applyTableStyle(wsDetalle, 'A1:W1', `A2:W${Math.max(2, detalleData.length)}`, 'E2:V1048576')
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
  applyTableStyle(wsIvaDetalle, 'A1:G1', `A2:G${Math.max(2, ivaDetalleData.length)}`, 'F2:G1048576')
  XLSX.utils.book_append_sheet(wb, wsIvaDetalle, 'Detalle IVA')

  const fileName = `preliquidacion_${data.periodo.replace(/[/\s]/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName, { cellStyles: true, bookSST: true })
}
