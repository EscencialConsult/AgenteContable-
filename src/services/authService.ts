export interface LoginResponse {
  token: string
  user: { dni: string; nombre: string }
}

export async function login(dni: string, nombre: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, nombre }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }

  return res.json()
}
