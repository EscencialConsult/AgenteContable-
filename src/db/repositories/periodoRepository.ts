import { db } from '../database'
import type { EstadoPeriodo, PeriodoFiscal } from '../../types/comprobante'

export function formatPeriodo(periodo: Pick<PeriodoFiscal, 'mes' | 'anio'>): string {
  return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`
}

export function getCurrentPeriodoParts() {
  const hoy = new Date()
  return {
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear(),
  }
}

export function getPeriodoFromFecha(fecha: string) {
  const partes = fecha.split(/[/-]/)
  if (partes.length !== 3) return getCurrentPeriodoParts()

  const mes = parseInt(partes[1])
  const anioRaw = partes[2]
  const anio = parseInt(anioRaw.length === 2 ? `20${anioRaw}` : anioRaw)

  if (!mes || !anio) return getCurrentPeriodoParts()
  return { mes, anio }
}

export async function getAllPeriodos(): Promise<PeriodoFiscal[]> {
  const periodos = await db.periodos.toArray()
  return periodos.sort((a, b) => b.anio - a.anio || b.mes - a.mes)
}

export async function getPeriodosByCliente(
  clienteId: number,
): Promise<PeriodoFiscal[]> {
  const periodos = await db.periodos
    .where('clienteId')
    .equals(clienteId)
    .toArray()
  return periodos.sort((a, b) => b.anio - a.anio || b.mes - a.mes)
}

export async function getOrCreatePeriodo(
  mes: number,
  anio: number,
  estado: EstadoPeriodo = 'abierto',
  clienteId?: number,
): Promise<number> {
  let existing: PeriodoFiscal | undefined

  if (clienteId) {
    existing = await db.periodos
      .where('[clienteId+anio+mes]')
      .equals([clienteId, anio, mes])
      .first()
  } else {
    existing = await db.periodos
      .where({ anio, mes })
      .first()
  }

  if (existing?.id) return existing.id

  const id = await db.periodos.add({
    clienteId,
    mes,
    anio,
    estado,
    createdAt: new Date().toISOString(),
  })
  if (!id) throw new Error('No se pudo crear el periodo')
  return id
}

export async function updatePeriodo(
  id: number,
  data: Partial<PeriodoFiscal>,
): Promise<void> {
  await db.periodos.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}
