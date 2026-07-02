import Dexie, { type EntityTable } from 'dexie'
import type { Comprobante, ChatMessage } from '../types/comprobante'

const db = new Dexie('agenteContable') as Dexie & {
  comprobantes: EntityTable<Comprobante, 'id'>
  chatMessages: EntityTable<ChatMessage, 'id'>
}

db.version(1).stores({
  comprobantes: '++id, tipo, cuit, fecha, categoria, estado, createdAt',
  chatMessages: '++id, role, createdAt',
})

export { db }
