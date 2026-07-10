import { db } from '../database'
import type { Cliente } from '../../types/comprobante'

export async function getAllClientes(): Promise<Cliente[]> {
  return db.clientes.orderBy('razonSocial').toArray()
}

export async function getClienteById(id: number): Promise<Cliente | undefined> {
  return db.clientes.get(id)
}

export async function addCliente(data: Omit<Cliente, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.clientes.add({
    ...data,
    createdAt: new Date().toISOString(),
  })
  if (!id) throw new Error('No se pudo crear el cliente')
  return id
}

export async function updateCliente(id: number, data: Partial<Cliente>): Promise<void> {
  await db.clientes.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteCliente(id: number): Promise<void> {
  await db.transaction('rw', db.clientes, db.comprobantes, db.periodos, db.lotesCarga, async () => {
    await db.clientes.delete(id)
    await db.comprobantes.where('clienteId').equals(id).modify({ clienteId: undefined } as any)
    await db.periodos.where('clienteId').equals(id).modify({ clienteId: undefined } as any)
    await db.lotesCarga.where('clienteId').equals(id).modify({ clienteId: undefined } as any)
  })
}
