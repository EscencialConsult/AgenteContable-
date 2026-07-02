import { db } from '../database'
import type { ChatMessage } from '../../types/comprobante'

export async function getAllMessages(): Promise<ChatMessage[]> {
  try {
    return await db.chatMessages.orderBy('id').toArray()
  } catch {
    console.warn('No se pudieron cargar mensajes previos')
    return []
  }
}

export async function saveMessage(msg: ChatMessage): Promise<ChatMessage> {
  try {
    const id = await db.chatMessages.add(msg)
    return { ...msg, id }
  } catch {
    return msg
  }
}
