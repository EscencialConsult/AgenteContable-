import OpenAI from 'openai'
import { ASSISTANT_ID } from '../../config/constants.js'
import { FALLBACK_MESSAGES } from '../../config/ui.js'

let sdk = null

function getSDK() {
  if (sdk) return sdk
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada en .env')
  sdk = new OpenAI({ apiKey })
  return sdk
}

export async function sendChatMessage(text, image) {
  const openai = getSDK()

  const thread = await openai.beta.threads.create()
  const threadId = thread.id

  try {
    const content = [{ type: 'text', text }]
    if (image) {
      content.push({ type: 'image_url', image_url: { url: image } })
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content,
    })

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: ASSISTANT_ID,
    })

    if (run.status !== 'completed') {
      throw Object.assign(
        new Error(`El assistant falló (estado: ${run.status})`),
        { status: 502 },
      )
    }

    const messages = await openai.beta.threads.messages.list(threadId)
    const data = [...messages.data]

    const assistantMsg = data.find(
      (m) => m.role === 'assistant' && m.content.length > 0,
    )

    return assistantMsg
      ? assistantMsg.content[0]?.text?.value || FALLBACK_MESSAGES.NO_RESPONSE
      : FALLBACK_MESSAGES.NO_RESPONSE
  } finally {
    try {
      await openai.beta.threads.del(threadId)
    } catch {
      // Cleanup best-effort
    }
  }
}
