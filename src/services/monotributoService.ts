import { db } from '../db/database'
import type { CategoriaMonotributo } from '../../config/monotributo'
import { CATEGORIAS_MONOTRIBUTO } from '../../config/monotributo'
import type { Comprobante } from '../types/comprobante'
const MONOTRIBUTO_LIMITE_MAXIMO = CATEGORIAS_MONOTRIBUTO[CATEGORIAS_MONOTRIBUTO.length - 1].facturacionMax

export interface FacturacionAnualResult {
  facturacion: number
  cantidadComprobantes: number
  desde: string
  hasta: string
}

export interface CategoriaRecomendada {
  categoria: CategoriaMonotributo | null
  excedeLimite: boolean
  pctUsado: number
  indice: number
}

export interface TablaCategoriaRow {
  categoria: CategoriaMonotributo
  esRecomendada: boolean
  excede: boolean
  pctUsado: number
}

function parseFecha(fecha: string): Date | null {
  if (!fecha) return null
  const partes = fecha.split(/[/-]/)
  if (partes.length !== 3) return null

  let dia: number, mes: number, anio: number

  if (/^\d{4}[/-]/.test(fecha)) {
    anio = parseInt(partes[0])
    mes = parseInt(partes[1]) - 1
    dia = parseInt(partes[2])
  } else {
    dia = parseInt(partes[0])
    mes = parseInt(partes[1]) - 1
    anio = parseInt(partes[2])
    if (anio < 100) anio += 2000
  }

  if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null
  return new Date(anio, mes, dia)
}

function esComprobanteVenta(c: Comprobante): boolean {
  if (c.categoria === 'venta') return true
  const iva = (c.clasificacionFiscal?.tratamientoIVA || '').replace(/[\s_]/g, '').toLowerCase()
  if (iva === 'debitofiscal') return true
  const tipo = c.tipo?.toUpperCase() || ''
  if (tipo.includes('FACTURA')) return true
  if (tipo.includes('TICKET')) return true
  return false
}

function calcularDesde(
  comprobantes: Comprobante[],
  referencia: Date,
): FacturacionAnualResult {
  const doceMesesAtras = new Date(referencia)
  doceMesesAtras.setMonth(referencia.getMonth() - 12)

  const filtrados = comprobantes.filter((c) => {
    if (!esComprobanteVenta(c)) return false
    if (!c.fecha) return false

    const fechaObj = parseFecha(c.fecha)
    if (!fechaObj) return false

    return fechaObj >= doceMesesAtras
  })

  const desde = filtrados.length > 0
    ? filtrados.reduce((min, c) => {
        const f = parseFecha(c.fecha)
        return f && f < min ? f : min
      }, new Date(864e13)).toISOString().split('T')[0]
    : doceMesesAtras.toISOString().split('T')[0]
  const hasta = referencia.toISOString().split('T')[0]

  let facturacion = 0
  for (const c of filtrados) {
    const signo = c.signoFiscal || 1
    facturacion += (c.netoGravado || 0) * signo
  }

  return {
    facturacion: Math.max(0, facturacion),
    cantidadComprobantes: filtrados.length,
    desde,
    hasta,
  }
}

export function calcularFacturacionAnualDesde(
  comprobantes: Comprobante[],
): FacturacionAnualResult {
  return calcularDesde(comprobantes, new Date())
}

export async function calcularFacturacionAnual(): Promise<FacturacionAnualResult> {
  const comprobantes = await db.comprobantes.toArray()
  return calcularDesde(comprobantes, new Date())
}

export function obtenerCategoriaRecomendada(
  facturacion: number,
): CategoriaRecomendada {
  if (facturacion <= 0) {
    return { categoria: CATEGORIAS_MONOTRIBUTO[0], excedeLimite: false, pctUsado: 0, indice: 0 }
  }

  if (facturacion > MONOTRIBUTO_LIMITE_MAXIMO) {
    const ultima = CATEGORIAS_MONOTRIBUTO[CATEGORIAS_MONOTRIBUTO.length - 1]
    const pct = (facturacion / ultima.facturacionMax) * 100
    return { categoria: null, excedeLimite: true, pctUsado: pct, indice: CATEGORIAS_MONOTRIBUTO.length }
  }

  for (let i = 0; i < CATEGORIAS_MONOTRIBUTO.length; i++) {
    if (facturacion <= CATEGORIAS_MONOTRIBUTO[i].facturacionMax) {
      const pct = (facturacion / CATEGORIAS_MONOTRIBUTO[i].facturacionMax) * 100
      return {
        categoria: CATEGORIAS_MONOTRIBUTO[i],
        excedeLimite: false,
        pctUsado: Math.round(pct * 10) / 10,
        indice: i,
      }
    }
  }

  const ultima = CATEGORIAS_MONOTRIBUTO[CATEGORIAS_MONOTRIBUTO.length - 1]
  const pct = (facturacion / ultima.facturacionMax) * 100
  return { categoria: null, excedeLimite: true, pctUsado: pct, indice: CATEGORIAS_MONOTRIBUTO.length }
}

export function getTablaCategorias(
  facturacion: number,
  recomendada: CategoriaRecomendada,
): TablaCategoriaRow[] {
  return CATEGORIAS_MONOTRIBUTO.map((cat, i) => {
    const esRecomendada = i === recomendada.indice
    const excede = facturacion > cat.facturacionMax
    const pctUsado = facturacion > 0
      ? Math.round((facturacion / cat.facturacionMax) * 1000) / 10
      : 0

    return { categoria: cat, esRecomendada, excede, pctUsado }
  })
}
