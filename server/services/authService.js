import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET no configurada en .env. ' +
      'Generá una con: openssl rand -base64 32',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionJWT(dni) {
  const secret = getSecret()
  const jwt = await new SignJWT({ dni })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
  return jwt
}

export async function verifySessionJWT(token) {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}
