import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { PORT, JSON_BODY_LIMIT } from './config/constants.js'
import authRouter from './server/routes/auth.js'
import chatRouter from './server/routes/chat.js'
import { errorHandler } from './server/middleware/errorHandler.js'

const app = express()

app.use(compression())
app.use(cors())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
}))

app.use(express.json({ limit: JSON_BODY_LIMIT }))

app.use('/api/auth/login', authRouter)
app.use('/api/chat', chatRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
