export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(err.error || `Error ${res.status}`, res.status)
  }

  return res.json()
}

export function apiPost<T>(url: string, body: unknown, token?: string): Promise<T> {
  return request<T>('POST', url, body, token)
}
