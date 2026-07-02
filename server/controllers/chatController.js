import { FALLBACK_MESSAGES } from '../../config/ui.js'
import { sendChatMessage } from '../services/openaiService.js'

export async function handleChat({ message, image }) {
  const userMessage = message?.trim() || FALLBACK_MESSAGES.ANALYZE_DOCUMENT
  const reply = await sendChatMessage(userMessage, image)
  return { reply }
}
