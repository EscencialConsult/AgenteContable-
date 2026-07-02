import { validateDNI } from '../../server/services/googleSheetsService.js'
import { createSessionJWT } from '../../server/services/authService.js'

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

  try {
    const { dni, nombre } = await req.json()

    if (!dni || !/^\d{7,8}$/.test(dni)) {
      return new Response(JSON.stringify({ error: 'DNI inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isValid = await validateDNI(dni)

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'DNI no autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = await createSessionJWT(dni)

    return new Response(JSON.stringify({ token, user: { dni, nombre: nombre.trim() } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
