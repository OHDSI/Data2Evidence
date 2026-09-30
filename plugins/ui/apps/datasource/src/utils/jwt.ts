import { decodeJwt } from 'jose'

export function getIdpUserId(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = decodeJwt(token)
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
