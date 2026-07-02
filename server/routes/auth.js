import { Router } from 'express'
import { validateDNI } from '../services/googleSheetsService.js'
import { createSessionJWT } from '../services/authService.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

const loginSchema = {
  dni: {
    required: true,
    type: 'string',
    pattern: /^\d{7,8}$/,
    message: 'DNI debe tener 7 u 8 dígitos numéricos',
  },
  nombre: {
    required: true,
    type: 'string',
    message: 'El nombre es requerido',
  },
}

router.post('/', validateBody(loginSchema), async (req, res, next) => {
  try {
    const isValid = await validateDNI(req.body.dni)

    if (!isValid) {
      return res.status(401).json({ error: 'DNI no autorizado' })
    }

    const token = await createSessionJWT(req.body.dni)

    res.json({ token, user: { dni: req.body.dni, nombre: req.body.nombre.trim() } })
  } catch (error) {
    next(error)
  }
})

export default router
