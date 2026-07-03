import { db } from '../database'
import type { LoteCarga } from '../../types/comprobante'

export async function addLoteCarga(data: Omit<LoteCarga, 'id'>): Promise<number> {
  const id = await db.lotesCarga.add(data)
  if (!id) throw new Error('No se pudo crear el lote de carga')
  return id
}

export async function updateLoteCarga(
  id: number,
  data: Partial<LoteCarga>,
): Promise<void> {
  await db.lotesCarga.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}
