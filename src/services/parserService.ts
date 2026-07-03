import type { Categoria, Comprobante } from '../types/comprobante'
import { ALICUOTAS, CONDITION_MAP } from '../config'
import { clasificarFiscalmente, getSignoFiscalPorComprobante } from './fiscalClassifierService'

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function extract(pattern: RegExp, text: string, group = 1): string {
  const match = text.match(pattern)
  return match?.[group]?.trim() || ''
}

function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/\s|\u00a0/g, '')
    .replace(/[^0-9,.-]/g, '')

  if (!cleaned) return 0

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastDot > lastComma) {
      return parseFloat(cleaned.replace(/,/g, '')) || 0
    }
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }

  if (cleaned.includes(',')) {
    const commaParts = cleaned.split(',')
    const decimalPart = commaParts.at(-1) || ''
    if (decimalPart.length === 3 && commaParts.length > 1) {
      return parseFloat(cleaned.replace(/,/g, '')) || 0
    }
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }

  const dotParts = cleaned.split('.')
  if (dotParts.length > 1) {
    const decimalPart = dotParts.at(-1) || ''
    if (decimalPart.length === 3) {
      return parseFloat(cleaned.replace(/\./g, '')) || 0
    }
    if (decimalPart.length > 2) {
      const digits = cleaned.replace(/\./g, '')
      return (parseInt(digits, 10) || 0) / 100
    }
  }

  return parseFloat(cleaned) || 0
}

function parseRate(raw: string): number {
  const cleaned = raw
    .replace(/\s|\u00a0/g, '')
    .replace(/[^0-9,.-]/g, '')

  if (!cleaned) return 0
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    return lastDot > lastComma
      ? parseFloat(cleaned.replace(/,/g, '')) || 0
      : parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (cleaned.includes(',')) return parseFloat(cleaned.replace(',', '.')) || 0
  return parseFloat(cleaned) || 0
}

function extractAmount(pattern: RegExp, text: string): number {
  const raw = extract(pattern, text)
  return raw ? parseAmount(raw) : 0
}

function extractAmountFromLines(text: string, labels: RegExp[], excludedLabels: RegExp[] = []): number {
  for (const line of getLines(text)) {
    const normalized = normalizeText(line)
    if (excludedLabels.some((label) => label.test(normalized))) continue
    if (!labels.some((label) => label.test(normalized))) continue

    const amountMatches = [...line.matchAll(/([0-9]{1,3}(?:[.,\s]\d{3})+(?:[,.]\d{2})|[0-9]+[,.]\d{2}|[0-9]+(?:\.\d{2,})?)/g)]
    const amounts = amountMatches.map((match) => parseAmount(match[1])).filter((value) => value > 0)
    if (amounts.length) return amounts.at(-1) || 0
  }

  return 0
}

function extractMoneyTotal(text: string): number {
  const amounts = [...text.matchAll(/\$+\s*([0-9][0-9.]*,[0-9]{2}|[0-9][0-9.]*\.[0-9]{2,}|[0-9][0-9.]*)/g)]
    .map((match) => parseAmount(match[1]))
    .filter((amount) => amount > 0)

  if (!amounts.length) return 0
  return Math.max(...amounts)
}

function extractMoneda(text: string): string {
  const raw = extract(/Moneda\s*:?\s*([A-Z]{3})/i, text)
  return raw || (/\bUSD\b/i.test(text) ? 'USD' : 'ARS')
}

function extractTotalPesos(text: string): number {
  return extractAmount(
    /(?:moneda de curso legal|pesos argentinos|asciende a)\s*[\s\S]{0,180}?\$\s*([0-9.,]+)/i,
    text,
  )
}

function extractTipoCambio(text: string): number {
  const raw = extract(
    /(?:tipo de cambio|cambio consignado|consignado es|cotizaci[o\u00f3]n)\s*(?:de|es|:)?\s*\$?\s*([0-9.,]+)/i,
    text,
  )
  return raw ? parseRate(raw) : 0
}

function convertCurrency(value: number, tipoCambio: number): number {
  if (!value || !tipoCambio) return value
  return Math.round(value * tipoCambio * 100) / 100
}

function normalizeExchangeRate(
  tipoCambioLeido: number,
  totalPesosLeido: number,
  totalOriginal: number,
): { tipoCambio: number; corrected: boolean } {
  if (!tipoCambioLeido || !totalOriginal) {
    return { tipoCambio: tipoCambioLeido, corrected: false }
  }

  const totalFactors = [1, 10, 100, 1000]
  const rateFactors = [1, 10, 100, 1000, 10000, 100000, 1000000]
  const candidates = rateFactors
    .map((factor) => ({
      factor,
      rate: tipoCambioLeido / factor,
    }))
    .filter((candidate) => candidate.rate > 0.01)

  let best = candidates[0]
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const expectedTotal = convertCurrency(totalOriginal, candidate.rate)
    const score = totalPesosLeido
      ? Math.min(
          ...totalFactors.map((factor) =>
            Math.abs((totalPesosLeido / factor) - expectedTotal) / Math.max(expectedTotal, 1),
          ),
        )
      : candidate.rate > 5000
        ? candidate.rate / 5000
        : 0

    const plausiblePenalty = candidate.rate > 5000 ? 0.5 : 0
    const correctionPenalty = tipoCambioLeido <= 5000 && candidate.factor !== 1 ? 0.05 : 0
    const finalScore = score + plausiblePenalty + correctionPenalty

    if (
      finalScore < bestScore ||
      (Math.abs(finalScore - bestScore) < 0.0001 && candidate.factor < best.factor)
    ) {
      best = candidate
      bestScore = finalScore
    }
  }

  return {
    tipoCambio: best.rate,
    corrected: best.factor !== 1,
  }
}

function normalizeConvertedTotal(
  totalPesosLeido: number,
  totalOriginal: number,
  tipoCambio: number,
): { totalPesos: number; corrected: boolean } {
  if (!totalPesosLeido || !totalOriginal || !tipoCambio) {
    return { totalPesos: totalPesosLeido, corrected: false }
  }

  const expected = convertCurrency(totalOriginal, tipoCambio)
  const tolerance = Math.max(2, expected * 0.003)
  if (Math.abs(totalPesosLeido - expected) <= tolerance) {
    return { totalPesos: totalPesosLeido, corrected: false }
  }

  const commonFactors = [10, 100, 1000, 0.1, 0.01]
  const factorMatch = commonFactors.some((factor) =>
    Math.abs((totalPesosLeido / factor) - expected) <= tolerance,
  )

  const sameDigits = String(Math.round(totalPesosLeido)).replace(/\D/g, '')
    .includes(String(Math.round(expected)).replace(/\D/g, ''))

  if (factorMatch || sameDigits) {
    return { totalPesos: expected, corrected: true }
  }

  return { totalPesos: totalPesosLeido, corrected: false }
}

function parseSpanishDate(text: string): string {
  const months: Record<string, string> = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    setiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12',
  }

  const match = text.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/i,
  )
  if (!match) return ''

  const day = match[1].padStart(2, '0')
  const month = months[match[2].toLowerCase()]
  return month ? `${day}/${month}/${match[3]}` : ''
}

function extractValueAfterLabel(text: string, label: RegExp): string {
  const lines = getLines(text)

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const normalized = normalizeText(line)
    if (!label.test(normalized)) continue

    const afterColon = line.split(':').slice(1).join(':').trim()
    if (afterColon) return afterColon

    const withoutLabel = line.replace(label, '').replace(/^[:\s-]+/, '').trim()
    if (withoutLabel && normalizeText(withoutLabel) !== normalized) return withoutLabel

    const nextLine = lines[index + 1]
    if (nextLine) return nextLine.trim()
  }

  return ''
}

function extractLabeledNumber(text: string, label: RegExp): string {
  const value = extractValueAfterLabel(text, label)
  return extract(/(\d{5,})/, value)
}

function inferAlicuota(neto: number, iva: number): string {
  if (!neto || !iva) return '0%'

  const ratio = iva / neto
  return ALICUOTAS.find((alicuota) => {
    const value = parseFloat(alicuota) / 100
    return Math.abs(ratio - value) < 0.03
  }) || '21%'
}

function inferTipo(text: string, normalized: string): string {
  if (/COMPROBANTE DE PAGO|PAGO FACIL|MERCADO PAGO/.test(normalized)) {
    return 'Recibo'
  }

  const lines = getLines(text)
  const facturaLineIndex = lines.findIndex((line) => /\bFACTURA\b/i.test(line))
  if (facturaLineIndex >= 0) {
    const headerWindow = lines
      .slice(Math.max(0, facturaLineIndex - 4), facturaLineIndex + 2)
      .map((line) => normalizeText(line))
      .join(' ')
    const headerLetter = extract(/\b([A-C])\b(?:\s+COD\.?\s*\d{1,3})?/, headerWindow)
    if (headerLetter) return `Factura ${headerLetter}`
  }

  const explicitType = extract(
    /(FACTURA|NOTA DE CR[E\u00c9]DITO|NOTA DE D[E\u00c9]BITO|TICKET|RECIBO)\s*([A-C])?/i,
    text,
  )
  const typeLine = normalizeText(explicitType)

  const letterFromFactura = extract(/FACTURA\s*([A-C])/i, text)
  if (letterFromFactura) return `Factura ${letterFromFactura}`

  const letterBeforeFactura = extract(/\b([A-C])\b[\s\S]{0,40}\bFACTURA\b/i, text)
  if (letterBeforeFactura) return `Factura ${letterBeforeFactura}`

  const code = extract(/COD\.?\s*(\d{1,3})/i, text).padStart(3, '0')
  const codeMap: Record<string, string> = {
    '001': 'Factura A',
    '006': 'Factura B',
    '011': 'Factura C',
    '003': 'Nota de Credito A',
    '008': 'Nota de Credito B',
    '013': 'Nota de Credito C',
    '002': 'Nota de Debito A',
    '007': 'Nota de Debito B',
    '012': 'Nota de Debito C',
  }
  if (codeMap[code]) return codeMap[code]

  if (typeLine.includes('NOTA DE CREDITO')) return 'Nota de Credito'
  if (typeLine.includes('NOTA DE DEBITO')) return 'Nota de Debito'
  if (typeLine.includes('FACTURA')) return 'Factura'

  return explicitType || 'Desconocido'
}

function inferCategoria(tipo: string, normalized: string): Categoria {
  const normalizedTipo = normalizeText(tipo)

  if (normalizedTipo.includes('NOTA DE CREDITO')) return 'nota_credito'
  if (normalizedTipo.includes('NOTA DE DEBITO')) return 'nota_debito'
  if (/COMPROBANTE DE PAGO|PAGO FACIL|MERCADO PAGO/.test(normalized)) return 'gasto_no_computable'
  if (normalizedTipo.includes('TICKET') || normalizedTipo.includes('RECIBO')) return 'gasto_deducible'
  if (normalizedTipo.includes('FACTURA')) return 'sin_clasificar'

  return 'sin_clasificar'
}

function inferRazonSocial(text: string, normalized: string): string {
  const paymentIssuer = extractValueAfterLabel(text, /COMPROBANTE DE PAGO DE/)
  if (paymentIssuer) return paymentIssuer

  const explicit = extract(
    /(?:Raz[o\u00f3]n Social|Denominaci[o\u00f3]n|Apellido y Nombre|Nombre|Se[n\u00f1]or(?:es)?)\s*:?\s*(.+)/i,
    text,
  )
  if (explicit) return explicit

  if (/FEDERACION PATRONAL/.test(normalized)) return 'FEDERACION PATRONAL'

  return extract(/(?:EMPRESA|COMERCIAL|S[AHRL]{2,5}|SA|SRL)\s*(.+)/i, normalized)
}

function inferNumero(text: string, isPaymentReceipt: boolean): number {
  if (isPaymentReceipt) {
    const operation = extractLabeledNumber(text, /NUMERO DE OPERACION/)
    const transaction = extractLabeledNumber(text, /NUMERO DE TRANSACCION/)
    const reference = extractLabeledNumber(text, /REFERENCIA/)
    return parseInt(operation || transaction || reference, 10) || 0
  }

  const pvAndNumber = text.match(
    /(?:Punto de Venta|Pto\.?\s*Vta\.?|P\.V\.?)\s*:?\s*(\d{4,5})[\s\S]{0,80}?(?:Comp\.?\s*N(?:ro|[o\u00ba])?\.?|N(?:ro|[o\u00ba])\.?|Numero)\s*:?\s*(\d{8})/i,
  )
  if (pvAndNumber) return parseInt(pvAndNumber[2], 10) || 0

  const numMatch = text.match(
    /(?:Comp\.?\s*N(?:ro|[o\u00ba])?\.?|N(?:ro|[o\u00ba])\.?|Numero)\s*:?\s*(\d{8})\b/i,
  )
  return numMatch ? parseInt(numMatch[1], 10) : 0
}

function inferPuntoVenta(text: string, isPaymentReceipt: boolean): number {
  if (isPaymentReceipt) return 0

  const pvMatch = text.match(
    /(?:Punto de Venta|Pto\.?\s*Vta\.?|P\.V\.?)\s*:?\s*(\d{4,5})/i,
  )
  return pvMatch ? parseInt(pvMatch[1], 10) : 0
}

function inferIVA(text: string): number {
  const summaryLineAmount = extractAmountFromLines(
    text,
    [/^IVA\s*(?:21|10[,.]5|27|5|2[,.]5|0)\s*%?/],
    [/SUBTOTAL\s*C\/?IVA/, /ALICUOTA/, /PRODUCTO/, /SERVICIO/],
  )
  if (summaryLineAmount) return summaryLineAmount

  const lineAmount = extractAmountFromLines(
    text,
    [/\bIVA\b/, /\bI\.V\.A\b/],
    [/CONDICION/, /FRENTE AL IVA/, /RESPONSABLE/, /MONOTRIBUTO/, /SUBTOTAL\s*C\/?IVA/, /ALICUOTA/],
  )

  return lineAmount || extractAmount(
    /(?:IVA|I\.V\.A\.?)\s*(?:\d{1,2}(?:[,.]\d{1,2})?%?\s*)?\$?\s*([0-9.,]+)/i,
    text,
  )
}

export function parseComprobante(text: string, _fileName?: string): Partial<Comprobante> {
  const normalized = normalizeText(text)
  const isPaymentReceipt = /COMPROBANTE DE PAGO|PAGO FACIL|MERCADO PAGO/.test(normalized)

  const tipo = inferTipo(text, normalized)
  const categoria = inferCategoria(tipo, normalized)

  const condicionRaw = extract(
    /(RESPONSABLE INSCRIPTO|MONOTRIBUTO|EXENTO|CONSUMIDOR FINAL|IVA NO RESPONSABLE)/i,
    normalized,
  )
  const condicionIVA = CONDITION_MAP[condicionRaw] || (
    condicionRaw ? condicionRaw.charAt(0).toUpperCase() + condicionRaw.slice(1).toLowerCase() : ''
  )

  const cuitRaw = extract(/(?:CUIT|C\.U\.I\.T\.)\s*:?\s*(\d{2}[-\s]?\d{8}[-\s]?\d{1}|\d{11})/i, text)
  const cuit = cuitRaw.replace(/[-\s]/g, '')

  const razonSocial = inferRazonSocial(text, normalized)

  const fechaComp = extract(
    /(?:Fecha\s*:?|Fecha de Emisi[o\u00f3]n\s*:?)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    text,
  )
  const fecha = fechaComp || parseSpanishDate(text) || extract(/\b(\d{2}\/\d{2}\/\d{4})\b/, text) || ''

  const puntoVenta = inferPuntoVenta(text, isPaymentReceipt)
  const numero = inferNumero(text, isPaymentReceipt)
  const moneda = extractMoneda(text)

  const totalDetectado = extractAmountFromLines(text, [/IMPORTE TOTAL/, /^TOTAL\b/, /TOTAL COMPROBANTE/]) ||
    extractAmount(/(?:Importe Total|Total Comprobante|Total)\s*:?\s*\$?\s*([0-9.,]+)/i, text) ||
    (isPaymentReceipt ? extractMoneyTotal(text) : 0)

  const netoDetectado = extractAmountFromLines(text, [/NETO GRAVADO/, /PRECIO NETO/, /^SUBTOTAL\b/]) ||
    extractAmount(/(?:Importe\s+)?(?:Neto Gravado|Subtotal|Precio Neto|Gravado)\s*:?\s*\$?\s*([0-9.,]+)/i, text)
  const ivaDetectado = inferIVA(text)
  const netoOriginal = netoDetectado || (isPaymentReceipt ? totalDetectado : 0)

  const noGravadoDetectado = extractAmountFromLines(text, [/NO GRAVADO/, /NO GRAV\./]) ||
    extractAmount(/(?:No Gravado|Importe No Gravado|No Grav\.)\s*:?\s*\$?\s*([0-9.,]+)/i, text)

  const exentoDetectado = extractAmountFromLines(text, [/EXENTO/]) ||
    extractAmount(/(?:Exento|Importe Exento)\s*:?\s*\$?\s*([0-9.,]+)/i, text)

  const percepcionesDetectadas = extractAmountFromLines(text, [/PERCEPCION/]) ||
    extractAmount(/(?:Percepci[o\u00f3]n\s*(?:IVA\s*)?)\s*:?\s*\$?\s*([0-9.,]+)/i, text)

  const retencionesDetectadas = extractAmountFromLines(text, [/RETENCION/, /\bRET\./]) ||
    extractAmount(/(?:Retenci[o\u00f3]n|Ret\.)\s*:?\s*\$?\s*([0-9.,]+)/i, text)

  const totalPesosLeido = moneda !== 'ARS' ? extractTotalPesos(text) : 0
  const tipoCambioDetectado = moneda !== 'ARS' ? extractTipoCambio(text) : 0
  const tipoCambioBase = tipoCambioDetectado || (totalPesosLeido && totalDetectado ? totalPesosLeido / totalDetectado : 0)
  const tipoCambioNormalizado = normalizeExchangeRate(tipoCambioBase, totalPesosLeido, totalDetectado)
  const tipoCambio = tipoCambioNormalizado.tipoCambio
  const totalPesosNormalizado = normalizeConvertedTotal(totalPesosLeido, totalDetectado, tipoCambio)
  const totalPesos = totalPesosNormalizado.totalPesos
  const usarPesos = moneda !== 'ARS' && totalPesos > 0 && tipoCambio > 0

  const netoGravado = usarPesos ? convertCurrency(netoOriginal, tipoCambio) : netoOriginal
  const iva = usarPesos ? convertCurrency(ivaDetectado, tipoCambio) : ivaDetectado
  const noGravado = usarPesos ? convertCurrency(noGravadoDetectado, tipoCambio) : noGravadoDetectado
  const exento = usarPesos ? convertCurrency(exentoDetectado, tipoCambio) : exentoDetectado
  const percepciones = usarPesos ? convertCurrency(percepcionesDetectadas, tipoCambio) : percepcionesDetectadas
  const retenciones = usarPesos ? convertCurrency(retencionesDetectadas, tipoCambio) : retencionesDetectadas
  const total = usarPesos ? totalPesos : totalDetectado

  const cae = extract(
    /(?:CAE|C\.A\.E\.?)\s*(?:N(?:ro|[o\u00ba])?\.?)?\s*:?\s*(\d{14}|\d{11,})/i,
    text,
  )

  const fechaVto = extract(
    /(?:Fecha de Vencimiento|Fecha de Vto\.? de CAE|Vencimiento|Vto\.?)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    text,
  )

  const operation = isPaymentReceipt ? extractLabeledNumber(text, /NUMERO DE OPERACION/) : ''
  const transaction = isPaymentReceipt ? extractLabeledNumber(text, /NUMERO DE TRANSACCION/) : ''
  const reference = isPaymentReceipt ? extractLabeledNumber(text, /REFERENCIA/) : ''
  const observaciones: string[] = []

  if (!netoDetectado && total && !isPaymentReceipt) {
    observaciones.push('No se detecto neto gravado, se uso el total como referencia')
  }

  if (isPaymentReceipt) {
    observaciones.push('Comprobante de pago sin datos fiscales de factura; se registra como gasto no computable')
    const identifiers = [
      operation ? `operacion ${operation}` : '',
      transaction ? `transaccion ${transaction}` : '',
      reference ? `referencia ${reference}` : '',
    ].filter(Boolean)
    if (identifiers.length) observaciones.push(`Identificadores de pago: ${identifiers.join(', ')}`)
  }

  if (iva === 0 && normalizeText(tipo).includes('FACTURA A')) {
    observaciones.push('Factura A sin IVA detectado; posible error de lectura')
  }

  if (usarPesos) {
    observaciones.push(`Comprobante en ${moneda}: importes convertidos a ARS con tipo de cambio ${tipoCambio.toFixed(6)}`)
    if (tipoCambioNormalizado.corrected) {
      observaciones.push(`Tipo de cambio leido inconsistente (${tipoCambioBase}); se normalizo a ${tipoCambio.toFixed(6)}`)
    }
    if (totalPesosNormalizado.corrected) {
      observaciones.push(`Total ARS leido inconsistente (${totalPesosLeido}); se uso ${totalPesos.toFixed(2)} por moneda original x tipo de cambio`)
    }
  }

  const base: Partial<Comprobante> = {
    tipo: tipo || 'Desconocido',
    cuit,
    razonSocial,
    fecha,
    puntoVenta,
    numero,
    condicionIVA,
    netoGravado,
    iva,
    noGravado,
    exento,
    ivaDetalle: [{
      alicuota: inferAlicuota(netoGravado, iva),
      neto: netoGravado,
      iva,
    }],
    impuestosDetalle: [
      ...(percepciones
        ? [{
            tipo: 'percepcion' as const,
            descripcion: 'Percepciones detectadas',
            importe: percepciones,
          }]
        : []),
      ...(retenciones
        ? [{
            tipo: 'retencion' as const,
            descripcion: 'Retenciones detectadas',
            importe: retenciones,
          }]
        : []),
    ],
    percepciones,
    retenciones,
    total,
    moneda,
    tipoCambio: tipoCambio || undefined,
    netoGravadoMonedaOriginal: usarPesos ? netoOriginal : undefined,
    ivaMonedaOriginal: usarPesos ? ivaDetectado : undefined,
    noGravadoMonedaOriginal: usarPesos ? noGravadoDetectado : undefined,
    exentoMonedaOriginal: usarPesos ? exentoDetectado : undefined,
    percepcionesMonedaOriginal: usarPesos ? percepcionesDetectadas : undefined,
    retencionesMonedaOriginal: usarPesos ? retencionesDetectadas : undefined,
    totalMonedaOriginal: usarPesos ? totalDetectado : undefined,
    totalPesos: usarPesos ? totalPesos : undefined,
    cae,
    fechaVencimiento: fechaVto,
    categoria,
    estado: 'pendiente',
    observaciones: observaciones.join('; '),
    createdAt: new Date().toISOString(),
  }
  const clasificacionFiscal = clasificarFiscalmente(base, text)

  return {
    ...base,
    categoria: clasificacionFiscal.categoria,
    signoFiscal: getSignoFiscalPorComprobante(base),
    clasificacionFiscal,
  }
}
