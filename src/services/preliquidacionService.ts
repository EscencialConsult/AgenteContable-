import type { Comprobante, IVADetalle } from '../types/comprobante'
import { ALICUOTAS } from '../config'

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
  comprobantesPendientes: number
  comprobantesSinClasificar: number
  comprobantesNoAfectan: number
  comprobantesIncluidos: number
  comprobantes: Comprobante[]
}

function getSignoFiscal(comprobante: Comprobante): 1 | -1 {
  if (comprobante.signoFiscal) return comprobante.signoFiscal
  return comprobante.tipo.toUpperCase().includes('NOTA DE CREDITO') ||
    comprobante.categoria === 'nota_credito'
    ? -1
    : 1
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

function getLineasIVA(comprobante: Comprobante): IVADetalle[] {
  if (comprobante.ivaDetalle?.length) return comprobante.ivaDetalle

  return [{
    alicuota: comprobante.iva === 0 ? '0%' : inferAlicuota(comprobante),
    neto: comprobante.netoGravado || 0,
    iva: comprobante.iva || 0,
  }]
}

function isVenta(comprobante: Comprobante): boolean {
  if (comprobante.clasificacionFiscal) {
    return comprobante.clasificacionFiscal.tratamientoIVA === 'debito_fiscal'
  }
  return comprobante.categoria === 'venta'
}

function isCompra(comprobante: Comprobante): boolean {
  if (comprobante.clasificacionFiscal) {
    return ['credito_fiscal', 'no_computable'].includes(comprobante.clasificacionFiscal.tratamientoIVA)
  }
  return ['compra', 'gasto_deducible', 'gasto_no_computable'].includes(comprobante.categoria)
}

function isCompraComputable(comprobante: Comprobante): boolean {
  if (comprobante.clasificacionFiscal) {
    return comprobante.clasificacionFiscal.tratamientoIVA === 'credito_fiscal'
  }
  return ['compra', 'gasto_deducible'].includes(comprobante.categoria)
}

function isObservado(comprobante: Comprobante): boolean {
  return (comprobante.nivelValidacion || 'success') === 'error' ||
    (comprobante.estadoRevision || comprobante.estado) === 'observado'
}

function isPendiente(comprobante: Comprobante): boolean {
  return (comprobante.estadoRevision || comprobante.estado) === 'pendiente'
}

function afectaPreliquidacion(comprobante: Comprobante): boolean {
  if (comprobante.clasificacionFiscal) {
    return comprobante.clasificacionFiscal.afectaPreliquidacion !== false
  }
  return ['venta', 'compra', 'gasto_deducible', 'gasto_no_computable'].includes(comprobante.categoria)
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
    if (!afectaPreliquidacion(comprobante)) continue

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
  const comprobantesIncluidos = comprobantes.filter(afectaPreliquidacion)
  const comprobantesObservados = comprobantes.filter(isObservado).length
  const comprobantesPendientes = comprobantes.filter(isPendiente).length
  const comprobantesSinClasificar = comprobantes.filter((c) => c.categoria === 'sin_clasificar').length
  const comprobantesNoAfectan = comprobantes.length - comprobantesIncluidos.length

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
    comprobantesComputables: comprobantesIncluidos.filter((c) => !isObservado(c)).length,
    comprobantesObservados,
    comprobantesPendientes,
    comprobantesSinClasificar,
    comprobantesNoAfectan,
    comprobantesIncluidos: comprobantesIncluidos.length,
    comprobantes,
  }
}
