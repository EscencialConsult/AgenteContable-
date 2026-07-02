import { authEdgeMiddleware } from '../server/middleware/auth.js'
import { handleChat } from '../server/controllers/chatController.js'
import { formatEdgeError } from '../server/middleware/errorHandler.js'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authResult = await authEdgeMiddleware(req)
  if (authResult instanceof Response) {
    return authResult
  }

  try {
    const body = await req.json()
    const { reply } = await handleChat(body)

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return formatEdgeError(error)
  }
}
