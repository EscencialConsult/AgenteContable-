import { apiPost } from './apiClient'

export interface ChatResponse {
  reply: string
}

export async function sendMessage(
  text: string,
  image?: string,
  token?: string,
): Promise<ChatResponse> {
  const body: Record<string, string> = {}
  if (text) body.message = text
  if (image) body.image = image

  return apiPost<ChatResponse>('/api/chat', body, token)
}
