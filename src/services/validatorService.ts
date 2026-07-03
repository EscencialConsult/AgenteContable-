import type { Comprobante, NivelValidacion, Validacion } from '../types/comprobante'
import { db } from '../db/database'
import { VALIDACION } from '../config'
import { clasificarFiscalmente, getSignoFiscalPorCategoria } from './fiscalClassifierService'

const IMPORTE_TOLERANCIA = 1

function validarCUIT(cuit: string): boolean {
  const cleaned = cuit.replace(/[-\s]/g, '')
  if (!/^\d{11}$/.test(cleaned)) return false

  const base = cleaned.slice(0, -1)
  const checkDigit = parseInt(cleaned.slice(-1))
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(base[i]) * multipliers[i]
  }

  const remainder = sum % 11
  let expected = 11 - remainder
  if (expected === 11) expected = 0
  if (expected === 10) expected = 9

  return expected === checkDigit
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function convertCurrency(value: number, tipoCambio: number): number {
  if (!value || !tipoCambio) return value
  return roundCurrency(value * tipoCambio)
}

function normalizeExchangeRate(
  tipoCambioLeido: number,
  totalPesosLeido: number,
  totalOriginal: number,
): number {
  if (!tipoCambioLeido || !totalOriginal) return tipoCambioLeido

  const totalFactors = [1, 10, 100, 1000]
  const rateFactors = [1, 10, 100, 1000, 10000, 100000, 1000000]
  let bestRate = tipoCambioLeido
  let bestFactor = 1
  let bestScore = Number.POSITIVE_INFINITY

  for (const factor of rateFactors) {
    const rate = tipoCambioLeido / factor
    if (rate <= 0.01) continue

    const expectedTotal = convertCurrency(totalOriginal, rate)
    const score = totalPesosLeido
      ? Math.min(
          ...totalFactors.map((totalFactor) =>
            Math.abs((totalPesosLeido / totalFactor) - expectedTotal) / Math.max(expectedTotal, 1),
          ),
        )
      : rate > 5000
        ? rate / 5000
        : 0

    const plausiblePenalty = rate > 5000 ? 0.5 : 0
    const correctionPenalty = tipoCambioLeido <= 5000 && factor !== 1 ? 0.05 : 0
    const finalScore = score + plausiblePenalty + correctionPenalty

    if (
      finalScore < bestScore ||
      (Math.abs(finalScore - bestScore) < 0.0001 && factor < bestFactor)
    ) {
      bestRate = rate
      bestFactor = factor
      bestScore = finalScore
    }
  }

  return bestRate
}

function normalizeConvertedTotal(totalPesosLeido: number, totalOriginal: number, tipoCambio: number): number {
  if (!totalOriginal || !tipoCambio) return totalPesosLeido

  const expected = convertCurrency(totalOriginal, tipoCambio)
  if (!totalPesosLeido) return expected

  const tolerance = Math.max(2, expected * 0.003)
  if (Math.abs(totalPesosLeido - expected) <= tolerance) return totalPesosLeido

  const commonFactors = [10, 100, 1000, 0.1, 0.01]
  const factorMatch = commonFactors.some((factor) =>
    Math.abs((totalPesosLeido / factor) - expected) <= tolerance,
  )
  const sameDigits = String(Math.round(totalPesosLeido)).replace(/\D/g, '')
    .includes(String(Math.round(expected)).replace(/\D/g, ''))

  return factorMatch || sameDigits ? expected : totalPesosLeido
}

export function normalizarMonedaExtranjera(
  comprobante: Partial<Comprobante>,
): Partial<Comprobante> {
  if (!comprobante.moneda || comprobante.moneda === 'ARS' || !comprobante.totalMonedaOriginal) {
    return comprobante
  }

  const tipoCambio = normalizeExchangeRate(
    comprobante.tipoCambio || 0,
    comprobante.totalPesos || comprobante.total || 0,
    comprobante.totalMonedaOriginal,
  )
  if (!tipoCambio) return comprobante

  const totalPesos = normalizeConvertedTotal(
    comprobante.totalPesos || comprobante.total || 0,
    comprobante.totalMonedaOriginal,
    tipoCambio,
  )
  const netoGravado = convertCurrency(
    comprobante.netoGravadoMonedaOriginal || comprobante.netoGravado || 0,
    tipoCambio,
  )
  const iva = convertCurrency(
    comprobante.ivaMonedaOriginal || comprobante.iva || 0,
    tipoCambio,
  )
  const noGravado = convertCurrency(comprobante.noGravadoMonedaOriginal || 0, tipoCambio)
  const exento = convertCurrency(comprobante.exentoMonedaOriginal || 0, tipoCambio)
  const percepciones = convertCurrency(comprobante.percepcionesMonedaOriginal || 0, tipoCambio)
  const retenciones = convertCurrency(comprobante.retencionesMonedaOriginal || 0, tipoCambio)

  return {
    ...comprobante,
    tipoCambio,
    totalPesos,
    netoGravado,
    iva,
    noGravado,
    exento,
    percepciones,
    retenciones,
    total: totalPesos,
    ivaDetalle: [{
      alicuota: comprobante.ivaDetalle?.[0]?.alicuota || (iva ? '21%' : '0%'),
      neto: netoGravado,
      iva,
    }],
  }
}

function parseAlicuota(alicuota: string): number {
  const value = parseFloat(alicuota.replace(',', '.').replace('%', ''))
  return Number.isFinite(value) ? value / 100 : 0
}

function getTotalTributos(comprobante: Partial<Comprobante>): number {
  const detalles = comprobante.impuestosDetalle || []
  if (detalles.length) {
    return detalles.reduce((sum, item) => sum + (item.importe || 0), 0)
  }
  return (comprobante.percepciones || 0) + (comprobante.retenciones || 0)
}

export async function findComprobanteDuplicado(
  comprobante: Partial<Comprobante>,
): Promise<Comprobante | undefined> {
  if (!comprobante.cuit || !comprobante.numero || !comprobante.puntoVenta) {
    return undefined
  }

  const duplicados = await db.comprobantes
    .where('cuit')
    .equals(comprobante.cuit)
    .toArray()

  return duplicados.find(
    (d) =>
      d.id !== comprobante.id &&
      d.numero === comprobante.numero &&
      d.puntoVenta === comprobante.puntoVenta,
  )
}

export function validarReglasContables(
  comprobante: Partial<Comprobante>,
): Validacion[] {
  const validaciones: Validacion[] = []
  const normalized = normalizarMonedaExtranjera(comprobante)
  const clasificacion = clasificarFiscalmente(normalized)
  const total = normalized.total || 0
  const neto = normalized.netoGravado || 0
  const iva = normalized.iva || 0
  const noGravado = normalized.noGravado || 0
  const exento = normalized.exento || 0
  const tributos = getTotalTributos(normalized)
  const tipo = (normalized.tipo || '').toUpperCase()

  if (clasificacion.requierePuntoVentaNumero && (!normalized.puntoVenta || !normalized.numero)) {
    validaciones.push({
      tipo: 'numeracion_fiscal_faltante',
      mensaje: 'Falta punto de venta o numero fiscal para este comprobante',
      nivel: 'error',
    })
  }

  if (clasificacion.requiereCAE && !normalized.cae) {
    validaciones.push({
      tipo: 'cae_faltante',
      mensaje: 'Comprobante fiscal sin CAE',
      nivel: 'error',
    })
  }

  if (normalized.cae && normalized.cae.length !== VALIDACION.CAE_LENGTH) {
    validaciones.push({
      tipo: 'cae_formato',
      mensaje: `CAE ${normalized.cae} no tiene formato valido (${VALIDACION.CAE_LENGTH} digitos)`,
      nivel: 'warning',
    })
  }

  if (neto && total && neto > total + IMPORTE_TOLERANCIA) {
    validaciones.push({
      tipo: 'importe_inconsistente',
      mensaje: 'El neto gravado no puede ser mayor al total',
      nivel: 'error',
    })
  }

  if (total > 0) {
    const totalEsperado = roundCurrency(neto + iva + noGravado + exento + tributos)
    const componentes = neto + iva + noGravado + exento + tributos
    if (componentes > 0 && Math.abs(totalEsperado - total) > IMPORTE_TOLERANCIA) {
      validaciones.push({
        tipo: 'total_inconsistente',
        mensaje: `Total informado ($${total.toFixed(2)}) no coincide con neto + IVA + tributos ($${totalEsperado.toFixed(2)})`,
        nivel: 'warning',
      })
    }
  }

  const lineasIVA = normalized.ivaDetalle?.length
    ? normalized.ivaDetalle
    : [{ alicuota: iva ? '21%' : '0%', neto, iva }]

  const ivaDetalleTotal = roundCurrency(lineasIVA.reduce((sum, linea) => sum + (linea.iva || 0), 0))
  if (Math.abs(ivaDetalleTotal - iva) > IMPORTE_TOLERANCIA) {
    validaciones.push({
      tipo: 'iva_detalle_total',
      mensaje: `Detalle de IVA ($${ivaDetalleTotal.toFixed(2)}) no coincide con IVA informado ($${iva.toFixed(2)})`,
      nivel: 'warning',
    })
  }

  for (const linea of lineasIVA) {
    const tasa = parseAlicuota(linea.alicuota)
    if (!tasa || !(linea.neto || 0)) continue

    const esperado = roundCurrency((linea.neto || 0) * tasa)
    if (Math.abs(esperado - (linea.iva || 0)) > IMPORTE_TOLERANCIA) {
      validaciones.push({
        tipo: 'iva_alicuota_inconsistente',
        mensaje: `IVA ${linea.alicuota} esperado $${esperado.toFixed(2)}, informado $${(linea.iva || 0).toFixed(2)}`,
        nivel: 'warning',
      })
    }
  }

  if (tipo.includes('FACTURA A') && iva === 0) {
    validaciones.push({
      tipo: 'factura_a_sin_iva',
      mensaje: 'Factura A sin IVA discriminado',
      nivel: 'warning',
    })
  }

  if (clasificacion.categoria === 'nota_credito' && comprobante.signoFiscal !== -1) {
    validaciones.push({
      tipo: 'signo_nota_credito',
      mensaje: 'Nota de credito debe restar importes en la preliquidacion',
      nivel: 'warning',
    })
  }

  if (
    clasificacion.tratamientoIVA === 'no_computable' &&
    ((normalized.iva || 0) > 0 || (normalized.ivaDetalle || []).some((linea) => (linea.iva || 0) > 0))
  ) {
    validaciones.push({
      tipo: 'iva_no_computable',
      mensaje: 'Pago/recibo no computable no debe mezclarse como credito fiscal',
      nivel: 'warning',
    })
  }

  if (clasificacion.confianza < 0.7) {
    validaciones.push({
      tipo: 'clasificacion_baja_confianza',
      mensaje: 'Clasificacion fiscal con baja confianza: revisar categoria antes de cerrar el periodo',
      nivel: 'warning',
    })
  }

  return validaciones
}

export async function validarComprobante(
  comprobante: Partial<Comprobante>,
): Promise<Validacion[]> {
  const normalized = normalizarMonedaExtranjera(comprobante)
  const validaciones: Validacion[] = []
  const reglasContables = validarReglasContables(normalized)

  if (!normalized.tipo) {
    validaciones.push({
      tipo: 'tipo_faltante',
      mensaje: 'Falta el tipo de comprobante',
      nivel: 'error',
    })
  }

  if (!normalized.cuit) {
    validaciones.push({
      tipo: 'cuit_faltante',
      mensaje: 'Falta CUIT del emisor',
      nivel: 'error',
    })
  } else if (!validarCUIT(normalized.cuit)) {
    validaciones.push({
      tipo: 'cuit_invalido',
      mensaje: `CUIT ${normalized.cuit} no es valido (digito verificador incorrecto)`,
      nivel: 'error',
    })
  }

  if (!normalized.fecha) {
    validaciones.push({
      tipo: 'fecha_faltante',
      mensaje: 'Falta la fecha de emision',
      nivel: 'error',
    })
  } else {
    const partes = normalized.fecha.split(/[/-]/)
    if (partes.length === 3) {
      const dia = parseInt(partes[0])
      const mes = parseInt(partes[1]) - 1
      const anioRaw = partes[2]
      const anio = parseInt(anioRaw.length === 2 ? `20${anioRaw}` : anioRaw)
      const fecha = new Date(anio, mes, dia)
      const hoy = new Date()

      const diffYears = (hoy.getTime() - fecha.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (diffYears > VALIDACION.ANIOS_MAX) {
        validaciones.push({
          tipo: 'periodo_anterior',
          mensaje: `Comprobante de hace mas de ${VALIDACION.ANIOS_MAX} anios (${normalized.fecha})`,
          nivel: 'warning',
        })
      }
      if (diffYears < -0.01) {
        validaciones.push({
          tipo: 'fecha_futura',
          mensaje: `La fecha (${normalized.fecha}) es futura`,
          nivel: 'warning',
        })
      }
    }
  }

  validaciones.push(...reglasContables)

  if (normalized.total && normalized.total > VALIDACION.IMPORTE_ELEVADO) {
    validaciones.push({
      tipo: 'gasto_elevado',
      mensaje: `Importe elevado: $${normalized.total.toLocaleString('es-AR')}`,
      nivel: 'warning',
    })
  }

  const duplicado = await findComprobanteDuplicado(normalized)
  if (duplicado) {
    validaciones.push({
      tipo: 'duplicado',
      mensaje: `Comprobante duplicado: mismo CUIT + Pto.Vta ${normalized.puntoVenta} + N ${normalized.numero}`,
      nivel: 'error',
    })
  }

  if (!normalized.archivoBase64) {
    validaciones.push({
      tipo: 'doc_faltante',
      mensaje: 'No hay imagen/PDF adjunto del comprobante',
      nivel: 'warning',
    })
  }

  return validaciones
}

export function getNivelGeneral(validaciones: Validacion[]): NivelValidacion {
  if (validaciones.some((v) => v.nivel === 'error')) return 'error'
  if (validaciones.some((v) => v.nivel === 'warning')) return 'warning'
  return 'success'
}

export async function prepararComprobanteValidado(
  comprobante: Partial<Comprobante>,
): Promise<Partial<Comprobante>> {
  const comprobanteNormalizado = normalizarMonedaExtranjera(comprobante)
  const clasificacionFiscal = clasificarFiscalmente(comprobanteNormalizado)
  const comprobanteClasificado: Partial<Comprobante> = {
    ...comprobanteNormalizado,
    categoria: clasificacionFiscal.categoria,
    signoFiscal: getSignoFiscalPorCategoria(clasificacionFiscal.categoria),
    clasificacionFiscal,
  }
  const validaciones = await validarComprobante(comprobanteClasificado)
  const nivelValidacion = getNivelGeneral(validaciones)
  const estadoRevision =
    nivelValidacion === 'error'
      ? 'observado'
      : comprobante.estadoRevision || comprobante.estado || 'validado'

  return {
    ...comprobanteClasificado,
    validaciones,
    nivelValidacion,
    estadoRevision,
    estado: (comprobante.estado || estadoRevision) as Comprobante['estado'],
    validatedAt: new Date().toISOString(),
  }
}

export { CATEGORIA_LABELS } from '../config'
