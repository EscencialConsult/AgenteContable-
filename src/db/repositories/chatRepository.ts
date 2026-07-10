import { db } from '../database'
import type { ChatMessage } from '../../types/comprobante'

export async function getAllMessages(): Promise<ChatMessage[]> {
  return db.chatMessages.orderBy('id').toArray()
}

export async function saveMessage(msg: ChatMessage): Promise<ChatMessage> {
  const id = await db.chatMessages.add(msg)
  return { ...msg, id }
}
