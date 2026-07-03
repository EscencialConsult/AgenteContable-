import { validateDNI } from '../../server/services/googleSheetsService.js'
import { createSessionJWT } from '../../server/services/authService.js'

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

  try {
    const { dni, nombre } = await req.json()

    if (!dni || !/^\d{7,8}$/.test(dni)) {
      return json({ error: 'DNI invalido' }, 400)
    }

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return json({ error: 'El nombre es requerido' }, 400)
    }

    const isValid = await validateDNI(dni)
    if (!isValid) {
      return json({ error: 'DNI no autorizado' }, 401)
    }

    const token = await createSessionJWT(dni)
    return json({ token, user: { dni, nombre: nombre.trim() } })
  } catch (error) {
    console.error('[netlify:auth-login]', error)
    return json({ error: 'Error interno del servidor' }, 500)
  }
}
