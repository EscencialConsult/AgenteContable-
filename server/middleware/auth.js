import { verifySessionJWT } from '../services/authService.js'

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  const token = header.slice(7)
  const payload = await verifySessionJWT(token)

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  req.user = payload
  next()
}

export async function authEdgeMiddleware(request) {
  const header = request.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token no proporcionado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = header.slice(7)
  const payload = await verifySessionJWT(token)

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return payload
}
