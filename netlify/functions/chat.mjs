import { authEdgeMiddleware } from '../../server/middleware/auth.js'
import { handleChat } from '../../server/controllers/chatController.js'
import { formatEdgeError } from '../../server/middleware/errorHandler.js'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Metodo no permitido' }, 405)
  }

  const authResult = await authEdgeMiddleware(req)
  if (authResult instanceof Response) {
    return authResult
  }

  try {
    const body = await req.json()
    const { reply } = await handleChat(body)
    return json({ reply })
  } catch (error) {
    return formatEdgeError(error)
  }
}
