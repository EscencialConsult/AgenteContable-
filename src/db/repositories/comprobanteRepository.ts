import { db } from '../database'
import type { Comprobante } from '../../types/comprobante'

export async function getAllComprobantes(opts?: {
  offset?: number
  limit?: number
}): Promise<Comprobante[]> {
  let query = db.comprobantes.orderBy('createdAt').reverse()
  if (opts?.offset) query = query.offset(opts.offset) as typeof query
  if (opts?.limit) query = query.limit(opts.limit) as typeof query
  return query.toArray()
}

export async function getAllComprobantesFlat(): Promise<Comprobante[]> {
  return db.comprobantes.toArray()
}

export async function getComprobantesByCliente(
  clienteId: number,
  opts?: { offset?: number; limit?: number },
): Promise<Comprobante[]> {
  let items: Comprobante[]
  if (opts?.offset !== undefined || opts?.limit !== undefined) {
    items = await db.comprobantes
      .where('clienteId')
      .equals(clienteId)
      .offset(opts?.offset || 0)
      .limit(opts?.limit || 25)
      .toArray()
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else {
    items = await db.comprobantes
      .where('clienteId')
      .equals(clienteId)
      .sortBy('createdAt')
    items.reverse()
  }
  return items
}

export async function getComprobantesFlatByCliente(
  clienteId: number,
  opts?: { offset?: number; limit?: number },
): Promise<Comprobante[]> {
  let query = db.comprobantes.where('clienteId').equals(clienteId)
  if (opts?.offset) query = query.offset(opts.offset) as typeof query
  if (opts?.limit) query = query.limit(opts.limit) as typeof query
  return query.toArray()
}

export async function countComprobantes(clienteId?: number): Promise<number> {
  if (clienteId) {
    return db.comprobantes.where('clienteId').equals(clienteId).count()
  }
  return db.comprobantes.count()
}

export async function countComprobantesByPeriodo(
  periodoId: number,
): Promise<number> {
  return db.comprobantes.where('periodoId').equals(periodoId).count()
}

export async function getComprobantesByPeriodo(
  periodoId?: number,
): Promise<Comprobante[]> {
  const sortByCreatedAtDesc = (items: Comprobante[]) =>
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (periodoId) {
    const items = await db.comprobantes
      .where('periodoId')
      .equals(periodoId)
      .toArray()
    return sortByCreatedAtDesc(items)
  }

  return getAllComprobantes()
}

export async function getComprobanteById(id: number): Promise<Comprobante | undefined> {
  return db.comprobantes.get(id)
}

export async function updateComprobante(
  id: number,
  data: Partial<Comprobante>,
): Promise<void> {
  const { id: _id, ...safe } = data
  await db.comprobantes.update(id, safe)
}

export async function deleteComprobante(id: number): Promise<void> {
  await db.comprobantes.delete(id)
}

export async function addComprobante(data: Comprobante): Promise<void> {
  await db.comprobantes.add(data)
}

export async function addComprobantes(items: Comprobante[]): Promise<void> {
  await db.comprobantes.bulkAdd(items)
}
