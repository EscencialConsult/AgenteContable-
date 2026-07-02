import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { handleChat } from '../controllers/chatController.js'

const router = Router()

const chatSchema = {
  message: {
    type: 'string',
    maxLength: 10000,
  },
  image: {
    type: 'string',
    maxLength: 5000000,
  },
}

router.post('/', authMiddleware, validateBody(chatSchema), async (req, res, next) => {
  try {
    const result = await handleChat(req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
