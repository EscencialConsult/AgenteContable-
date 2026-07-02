import type { Comprobante } from '../types/comprobante'
import { CONDITION_MAP, CATEGORY_MAP } from '../config'

function extract(pattern: RegExp, text: string, group = 1): string {
  const match = text.match(pattern)
  return match?.[group]?.trim() || ''
}

function extractAmount(pattern: RegExp, text: string): number {
  const raw = extract(pattern, text)
  if (!raw) return 0
  const cleaned = raw
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '')
  return parseFloat(cleaned) || 0
}

export function parseComprobante(text: string, _fileName?: string): Partial<Comprobante> {
  const upper = text.toUpperCase()

  const tipoRaw = extract(/(FACTURA|NOTA DE CRÉDITO|NOTA DE DÉBITO|TICKET|RECIBO)\s*([A-C])?/i, text)
  const tipoLetra = extract(/FACTURA\s*([A-C])/i, text)
  const tipo = tipoLetra
    ? `Factura ${tipoLetra}`
    : tipoRaw || 'Desconocido'

  const condicionRaw = extract(
    /(RESPONSABLE INSCRIPTO|MONOTRIBUTO|EXENTO|CONSUMIDOR FINAL|IVA NO RESPONSABLE)/i,
    upper,
  )
  const condicionIVA = CONDITION_MAP[condicionRaw] || (condicionRaw ? condicionRaw.charAt(0).toUpperCase() + condicionRaw.slice(1).toLowerCase() : '')

  const categoria = Object.entries(CATEGORY_MAP).find(([key]) =>
    tipo.toLowerCase().includes(key),
  )?.[1] || 'sin_clasificar'

  const cuitRaw = extract(/(?:CUIT|C.U.I.T.)\s*:?\s*(\d{2}[-\s]?\d{8}[-\s]?\d{1}|\d{11})/i, text)
  const cuit = cuitRaw.replace(/[-\s]/g, '')

  const razonSocial = extract(
    /(?:Raz[oó]n Social|Denominaci[oó]n|Apellido y Nombre|Nombre|Señor[es]?)\s*:?\s*(.+)/i,
    text,
  ) || extract(/(?:EMPRESA|COMERCIAL|S[AHRL]{2,5}|SA|SRL)\s*(.+)/i, upper)

  const fechaComp = extract(
    /(?:Fecha\s*:?|Fecha de Emisi[oó]n\s*:?)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    text,
  )
  const fecha = fechaComp || extract(/\b(\d{2}\/\d{2}\/\d{4})\b/, text) || ''

  const pvMatch = text.match(
    /(?:Punto de Venta|Pto\.\s*Vta\.?|P.V\.?)\s*:?\s*(\d{4,5})/i,
  )
  const puntoVenta = pvMatch ? parseInt(pvMatch[1]) : 0

  const numMatch = text.match(
    /(?:N[°º]\s*|N[úu]mero\s*|Comp\.\s*N[°º]\s*)?\s*(\d{8})\b/,
  )
  const numero = numMatch ? parseInt(numMatch[1]) : 0

  const netoGravado = extractAmount(
    /(?:Neto Gravado|Subtotal|Precio Neto|Gravado)\s*\$?\s*([0-9.,]+)/i,
    text,
  )

  const iva = extractAmount(
    /(?:IVA|I\.V\.A\.?)\s*(?:\d{1,2}%\s*)?\$?\s*([0-9.,]+)/i,
    text,
  )

  const percepciones = extractAmount(
    /(?:Percepci[oó]n\s*(?:IVA\s*)?|Impuesto)\s*\$?\s*([0-9.,]+)/i,
    text,
  )

  const retenciones = extractAmount(
    /(?:Retenci[oó]n|Ret\.)\s*\$?\s*([0-9.,]+)/i,
    text,
  )

  const total = extractAmount(
    /(?:Total|Importe Total|Total Comprobante)\s*\$?\s*([0-9.,]+)/i,
    text,
  )

  const cae = extract(
    /(?:CAE|C\.A\.E\.?)\s*(?:N[°º]\s*)?\s*(\d{14}|\d{11,})/i,
    text,
  )

  const fechaVto = extract(
    /(?:Fecha de Vencimiento|Vencimiento|Vto\.?)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    text,
  )

  const observaciones: string[] = []

  if (!netoGravado && total) {
    observaciones.push('No se detectó neto gravado, se usó el total como referencia')
  }

  if (iva === 0 && tipo.toUpperCase().includes('FACTURA A')) {
    observaciones.push('Factura A sin IVA detectado — posible error de lectura')
  }

  return {
    tipo: tipo || 'Desconocido',
    cuit,
    razonSocial,
    fecha,
    puntoVenta,
    numero,
    condicionIVA,
    netoGravado,
    iva,
    percepciones,
    retenciones,
    total,
    cae,
    fechaVencimiento: fechaVto,
    categoria: categoria as Comprobante['categoria'],
    estado: 'pendiente',
    observaciones: observaciones.join('; '),
    createdAt: new Date().toISOString(),
  }
}
