import OpenAI, { toFile } from 'openai'
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

function decodeBase64(base64) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64')
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function parseDataImage(image) {
  if (typeof image !== 'string') return null

  const match = image.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/)
  if (!match) return null

  return {
    mimeType: match[1],
    data: decodeBase64(match[2].replace(/\s/g, '')),
  }
}

async function createVisionFile(openai, image) {
  const parsed = parseDataImage(image)
  if (!parsed) return null

  const extension = parsed.mimeType.split('/')[1].replace('jpeg', 'jpg')
  const file = await toFile(parsed.data, `chat-attachment.${extension}`, {
    type: parsed.mimeType,
  })

  return openai.files.create({
    file,
    purpose: 'vision',
  })
}

function getRunFailureMessage(run) {
  const code = run?.last_error?.code
  const message = run?.last_error?.message
  return [code, message].filter(Boolean).join(': ') || `estado: ${run.status}`
}

async function sendFallbackChatMessage(openai, text) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Sos un asistente contable argentino. Responde claro, practico y breve. Si faltan datos, pedi exactamente lo necesario.',
      },
      { role: 'user', content: text },
    ],
  })

  return completion.choices[0]?.message?.content || FALLBACK_MESSAGES.NO_RESPONSE
}

async function sendAssistantMessage(openai, text, image) {
  const thread = await openai.beta.threads.create()
  const threadId = thread.id
  let uploadedImageFileId = null

  try {
    const content = [{ type: 'text', text }]

    const uploadedImage = await createVisionFile(openai, image)
    if (uploadedImage?.id) {
      uploadedImageFileId = uploadedImage.id
      content.push({ type: 'image_file', image_file: { file_id: uploadedImage.id } })
    } else if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
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
      const detail = getRunFailureMessage(run)
      throw Object.assign(
        new Error(`El assistant fallo (${detail})`),
        { status: 502, assistantRun: run },
      )
    }

    const messages = await openai.beta.threads.messages.list(threadId)
    const data = [...messages.data]

    const assistantMsg = data.find(
      (message) => message.role === 'assistant' && message.content.length > 0,
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
    if (uploadedImageFileId) {
      try {
        await openai.files.del(uploadedImageFileId)
      } catch {
        // Cleanup best-effort
      }
    }
  }
}

export async function sendChatMessage(text, image) {
  const openai = getSDK()

  try {
    return await sendAssistantMessage(openai, text, image)
  } catch (error) {
    if (error?.status !== 502 && error?.status !== 400) {
      throw error
    }

    console.warn('[openai:assistant:fallback]', {
      message: error?.message,
      status: error?.status,
      lastError: error?.assistantRun?.last_error,
    })

    return sendFallbackChatMessage(openai, text)
  }
}
