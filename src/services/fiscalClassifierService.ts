import type { Categoria, ClasificacionFiscal, Comprobante } from '../types/comprobante'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term))
}

function isNotaCredito(tipo: string): boolean {
  return includesAny(tipo, ['NOTA DE CREDITO', 'NOTA CREDITO'])
}

function isNotaDebito(tipo: string): boolean {
  return includesAny(tipo, ['NOTA DE DEBITO', 'NOTA DEBITO'])
}

function isFactura(tipo: string): boolean {
  return tipo.includes('FACTURA')
}

function hasCategoriaPreliquidable(categoria?: Categoria): boolean {
  return ['venta', 'compra', 'gasto_deducible'].includes(categoria || '')
}

function getTratamientoPorCategoria(
  categoria: Categoria,
  iva: number,
): ClasificacionFiscal['tratamientoIVA'] {
  if (categoria === 'venta') return iva > 0 ? 'debito_fiscal' : 'sin_iva'
  if (categoria === 'compra' || categoria === 'gasto_deducible') {
    return iva > 0 ? 'credito_fiscal' : 'sin_iva'
  }
  if (categoria === 'gasto_no_computable') return 'no_computable'
  return 'sin_iva'
}

function isPagoSinFactura(tipo: string, text: string, observaciones: string): boolean {
  return tipo.includes('RECIBO') && (
    includesAny(text, ['COMPROBANTE DE PAGO', 'MERCADO PAGO', 'PAGO FACIL', 'PAGO SIN FACTURA']) ||
    includesAny(observaciones, ['SIN DATOS FISCALES DE FACTURA', 'PAGO SIN FACTURA'])
  )
}

function hasTaxOnly(comprobante: Partial<Comprobante>, text: string): Categoria | null {
  const tipo = normalize(comprobante.tipo || '')
  if (tipo.includes('RETENCION') || text.includes('RETENCION')) return 'retencion'
  if (tipo.includes('PERCEPCION') || text.includes('PERCEPCION')) return 'percepcion'
  if ((comprobante.retenciones || 0) > 0 && !(comprobante.netoGravado || 0)) return 'retencion'
  if ((comprobante.percepciones || 0) > 0 && !(comprobante.netoGravado || 0)) return 'percepcion'
  return null
}

export function clasificarFiscalmente(
  comprobante: Partial<Comprobante>,
  rawText = '',
): ClasificacionFiscal {
  const tipo = normalize(comprobante.tipo || '')
  const text = normalize(`${rawText} ${comprobante.observaciones || ''} ${comprobante.razonSocial || ''}`)
  const motivos: string[] = []
  let categoria: Categoria = comprobante.categoria || 'sin_clasificar'
  let tratamientoIVA: ClasificacionFiscal['tratamientoIVA'] = 'sin_iva'
  let requiereCAE = false
  let requierePuntoVentaNumero = false
  let afectaPreliquidacion = true
  let confianza = 0.45

  const taxOnly = hasTaxOnly(comprobante, text)
  if (taxOnly) {
    categoria = taxOnly
    tratamientoIVA = 'sin_iva'
    requiereCAE = false
    requierePuntoVentaNumero = false
    afectaPreliquidacion = true
    confianza = 0.78
    motivos.push(taxOnly === 'retencion' ? 'Documento identificado como retencion' : 'Documento identificado como percepcion')
  } else if (isPagoSinFactura(tipo, text, comprobante.observaciones || '')) {
    categoria = 'gasto_no_computable'
    tratamientoIVA = 'no_computable'
    requiereCAE = false
    requierePuntoVentaNumero = false
    afectaPreliquidacion = false
    confianza = 0.92
    motivos.push('Pago o recibo sin factura fiscal: no genera credito fiscal')
  } else if (isNotaCredito(tipo)) {
    requiereCAE = true
    requierePuntoVentaNumero = true
    confianza = 0.64
    if (hasCategoriaPreliquidable(categoria)) {
      tratamientoIVA = getTratamientoPorCategoria(categoria, comprobante.iva || 0)
      afectaPreliquidacion = true
      confianza = 0.82
      motivos.push('Nota de credito clasificada manualmente: revierte importes con signo fiscal negativo')
    } else {
      categoria = categoria === 'nota_credito' ? categoria : 'sin_clasificar'
      tratamientoIVA = 'sin_iva'
      afectaPreliquidacion = false
      motivos.push('Nota de credito pendiente de clasificar como venta, compra o gasto antes de preliquidar')
    }
  } else if (isNotaDebito(tipo)) {
    requiereCAE = true
    requierePuntoVentaNumero = true
    confianza = 0.64
    if (hasCategoriaPreliquidable(categoria)) {
      tratamientoIVA = getTratamientoPorCategoria(categoria, comprobante.iva || 0)
      afectaPreliquidacion = true
      confianza = 0.82
      motivos.push('Nota de debito clasificada manualmente: suma importes al periodo')
    } else {
      categoria = categoria === 'nota_debito' ? categoria : 'sin_clasificar'
      tratamientoIVA = 'sin_iva'
      afectaPreliquidacion = false
      motivos.push('Nota de debito pendiente de clasificar como venta, compra o gasto antes de preliquidar')
    }
  } else if (isFactura(tipo)) {
    requiereCAE = true
    requierePuntoVentaNumero = true
    confianza = 0.58

    if (hasCategoriaPreliquidable(categoria)) {
      tratamientoIVA = getTratamientoPorCategoria(categoria, comprobante.iva || 0)
      afectaPreliquidacion = true
      confianza = 0.82
      motivos.push('Factura fiscal clasificada manualmente para preliquidacion')
    } else if (categoria === 'gasto_no_computable') {
      tratamientoIVA = 'no_computable'
      afectaPreliquidacion = false
      confianza = 0.78
      motivos.push('Factura marcada como no computable')
    } else {
      categoria = 'sin_clasificar'
      tratamientoIVA = 'sin_iva'
      afectaPreliquidacion = false
      motivos.push('Factura fiscal pendiente de clasificar como venta, compra o gasto antes de preliquidar')
    }
  } else if (tipo.includes('TICKET') || tipo.includes('RECIBO')) {
    categoria = categoria === 'sin_clasificar' ? 'gasto_deducible' : categoria
    tratamientoIVA = (comprobante.iva || 0) > 0 ? 'credito_fiscal' : 'sin_iva'
    requiereCAE = false
    requierePuntoVentaNumero = false
    afectaPreliquidacion = true
    confianza = 0.65
    motivos.push('Ticket o recibo con impacto de gasto')
  } else if ((comprobante.total || 0) > 0) {
    categoria = categoria === 'sin_clasificar' ? 'gasto_no_computable' : categoria
    tratamientoIVA = 'no_computable'
    requiereCAE = false
    requierePuntoVentaNumero = false
    afectaPreliquidacion = false
    confianza = 0.5
    motivos.push('Documento con importe sin forma fiscal clara')
  }

  if (categoria === 'gasto_no_computable') {
    tratamientoIVA = 'no_computable'
    afectaPreliquidacion = false
  }

  if (hasCategoriaPreliquidable(categoria) && !isFactura(tipo) && !isNotaCredito(tipo) && !isNotaDebito(tipo)) {
    tratamientoIVA = getTratamientoPorCategoria(categoria, comprobante.iva || 0)
  }

  return {
    categoria,
    tratamientoIVA,
    requiereCAE,
    requierePuntoVentaNumero,
    afectaPreliquidacion,
    confianza,
    motivos,
  }
}

export function getSignoFiscalPorCategoria(categoria: Categoria): 1 | -1 {
  return categoria === 'nota_credito' ? -1 : 1
}

export function getSignoFiscalPorComprobante(comprobante: Partial<Comprobante>): 1 | -1 {
  const tipo = normalize(comprobante.tipo || '')
  if (isNotaCredito(tipo) || comprobante.categoria === 'nota_credito') return -1
  return 1
}
