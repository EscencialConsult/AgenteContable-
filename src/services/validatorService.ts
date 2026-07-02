import type { Comprobante, Validacion } from '../types/comprobante'
import { db } from '../db/database'
import { VALIDACION } from '../config'

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

function getIVAEsperado(comprobante: Partial<Comprobante>): number | null {
  const tipo = (comprobante.tipo || '').toUpperCase()
  if (!tipo.includes('FACTURA')) return null

  if (tipo.includes('A') && comprobante.netoGravado) {
    return Math.round(comprobante.netoGravado * 0.21 * 100) / 100
  }
  if (tipo.includes('B') && comprobante.total) {
    const ivaIncluido = comprobante.total * 0.21
    return Math.round(ivaIncluido * 100) / 100
  }

  return null
}

export async function validarComprobante(
  comprobante: Partial<Comprobante>,
): Promise<Validacion[]> {
  const validaciones: Validacion[] = []

  if (!comprobante.tipo) {
    validaciones.push({
      tipo: 'tipo_faltante',
      mensaje: 'Falta el tipo de comprobante',
      nivel: 'error',
    })
  }

  if (!comprobante.cuit) {
    validaciones.push({
      tipo: 'cuit_faltante',
      mensaje: 'Falta CUIT del emisor',
      nivel: 'error',
    })
  } else if (!validarCUIT(comprobante.cuit)) {
    validaciones.push({
      tipo: 'cuit_invalido',
      mensaje: `CUIT ${comprobante.cuit} no es válido (dígito verificador incorrecto)`,
      nivel: 'error',
    })
  }

  if (!comprobante.fecha) {
    validaciones.push({
      tipo: 'fecha_faltante',
      mensaje: 'Falta la fecha de emisión',
      nivel: 'error',
    })
  } else {
    const partes = comprobante.fecha.split(/[/-]/)
    if (partes.length === 3) {
      const dia = parseInt(partes[0])
      const mes = parseInt(partes[1]) - 1
      const anio = parseInt(partes[2])
      const fecha = new Date(anio, mes, dia)
      const hoy = new Date()

      const diffYears = (hoy.getTime() - fecha.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (diffYears > VALIDACION.ANIOS_MAX) {
        validaciones.push({
          tipo: 'periodo_anterior',
          mensaje: `Comprobante de hace más de 5 años (${comprobante.fecha})`,
          nivel: 'warning',
        })
      }
      if (diffYears < -0.01) {
        validaciones.push({
          tipo: 'fecha_futura',
          mensaje: `La fecha (${comprobante.fecha}) es futura`,
          nivel: 'warning',
        })
      }
    }
  }

  if (comprobante.netoGravado && comprobante.total) {
    if (comprobante.netoGravado > comprobante.total) {
      validaciones.push({
        tipo: 'importe_inconsistente',
        mensaje: 'El neto gravado no puede ser mayor al total',
        nivel: 'error',
      })
    }
  }

  if (comprobante.netoGravado && comprobante.iva !== undefined) {
    const esperado = getIVAEsperado(comprobante)
    if (esperado !== null && Math.abs(comprobante.iva - esperado) > VALIDACION.IVA_DIFF_THRESHOLD) {
      validaciones.push({
        tipo: 'iva_inconsistente',
        mensaje: `IVA calculado ($${esperado.toFixed(2)}) no coincide con el registrado ($${comprobante.iva.toFixed(2)})`,
        nivel: 'warning',
      })
    }
  }

  if (comprobante.total && comprobante.total > VALIDACION.IMPORTE_ELEVADO) {
    validaciones.push({
      tipo: 'gasto_elevado',
      mensaje: `Importe elevado: $${comprobante.total.toLocaleString('es-AR')}`,
      nivel: 'warning',
    })
  }

  const tipo = (comprobante.tipo || '').toUpperCase()
  if (
    (tipo.includes('FACTURA A') || tipo.includes('FACTURA B') || tipo.includes('FACTURA C')) &&
    !comprobante.cae
  ) {
    validaciones.push({
      tipo: 'cae_faltante',
      mensaje: 'Factura sin CAE — puede no ser válida',
      nivel: 'error',
    })
  }

  if (comprobante.cae && comprobante.cae.length !== VALIDACION.CAE_LENGTH) {
    validaciones.push({
      tipo: 'cae_formato',
      mensaje: `CAE ${comprobante.cae} no tiene formato válido (${VALIDACION.CAE_LENGTH} dígitos)`,
      nivel: 'warning',
    })
  }

  if (comprobante.id && comprobante.cuit && comprobante.numero && comprobante.puntoVenta) {
    const duplicados = await db.comprobantes
      .where('cuit')
      .equals(comprobante.cuit)
      .toArray()

    const dup = duplicados.find(
      (d) =>
        d.id !== comprobante.id &&
        d.numero === comprobante.numero &&
        d.puntoVenta === comprobante.puntoVenta,
    )

    if (dup) {
      validaciones.push({
        tipo: 'duplicado',
        mensaje: `Comprobante duplicado: mismo CUIT + Pto.Vta ${comprobante.puntoVenta} + N° ${comprobante.numero}`,
        nivel: 'error',
      })
    }
  }

  if (!comprobante.archivoBase64) {
    validaciones.push({
      tipo: 'doc_faltante',
      mensaje: 'No hay imagen/PDF adjunto del comprobante',
      nivel: 'warning',
    })
  }

  return validaciones
}

export function getNivelGeneral(validaciones: Validacion[]): 'error' | 'warning' | 'success' {
  if (validaciones.some((v) => v.nivel === 'error')) return 'error'
  if (validaciones.some((v) => v.nivel === 'warning')) return 'warning'
  return 'success'
}

// Re-exportado desde config centralizada
export { CATEGORIA_LABELS } from '../config'
