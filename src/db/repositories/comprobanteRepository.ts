import { db } from '../database'
import type { Comprobante } from '../../types/comprobante'

export async function getAllComprobantes(): Promise<Comprobante[]> {
  return db.comprobantes.orderBy('createdAt').reverse().toArray()
}

export async function getAllComprobantesFlat(): Promise<Comprobante[]> {
  return db.comprobantes.toArray()
}

export async function updateComprobante(
  id: number,
  data: Partial<Comprobante>,
): Promise<void> {
  await db.comprobantes.update(id, data as Comprobante)
}

export async function deleteComprobante(id: number): Promise<void> {
  await db.comprobantes.delete(id)
}

export async function addComprobante(data: Comprobante): Promise<void> {
  await db.comprobantes.add(data)
}
