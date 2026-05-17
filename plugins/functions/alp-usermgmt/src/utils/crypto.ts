import { Buffer } from 'buffer'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12 // GCM recommended IV length
const TAG_LEN = 16

export function generateKey(): string {
  return randomBytes(32).toString('base64')
}

function loadKey(keyB64: string): Buffer {
  const buf = Buffer.from(keyB64, 'base64')
  if (buf.length !== 32) {
    throw new Error('LINKED_ACCOUNT_ENC_KEY must be 32 bytes (base64-encoded)')
  }
  return buf
}

/** Returns base64(iv ‖ tag ‖ ciphertext) */
export function encryptToken(plaintext: string, keyB64: string): string {
  const key = loadKey(keyB64)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

/** Decrypts a base64 payload produced by {@link encryptToken} — expects layout iv ‖ tag ‖ ciphertext */
export function decryptToken(payloadB64: string, keyB64: string): string {
  const key = loadKey(keyB64)
  const buf = Buffer.from(payloadB64, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error(`decryptToken: payload too short (${buf.length} bytes, need at least ${IV_LEN + TAG_LEN + 1})`)
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
