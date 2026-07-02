import { OPENAI_BASE_URL, OPENAI_BETA } from '../../config/constants.js'

let client = null

export function getOpenAIClient() {
  if (client) return client

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada en .env')
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': OPENAI_BETA,
  }

  client = {
    async request(method, path, body) {
      const url = `${OPENAI_BASE_URL}${path}`
      const opts = { method, headers }
      if (body) opts.body = JSON.stringify(body)

      const res = await fetch(url, opts)

      if (!res.ok) {
        const err = await res.text()
        const msg = `OpenAI ${method} ${path}: ${res.status} ${err.slice(0, 200)}`
        const error = new Error(msg)
        error.status = res.status
        throw error
      }

      return res.json()
    },

    async requestRaw(method, path, body, customHeaders = {}) {
      const url = `${OPENAI_BASE_URL}${path}`
      const opts = {
        method,
        headers: { ...headers, ...customHeaders },
      }
      if (body) opts.body = JSON.stringify(body)

      const res = await fetch(url, opts)
      return res
    },
  }

  return client
}
