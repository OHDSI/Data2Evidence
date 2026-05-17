import { assertEquals, assertNotEquals, assertThrows } from 'jsr:@std/assert'
import { Buffer } from 'buffer'
import { encryptToken, decryptToken, generateKey } from './crypto.ts'

const key = generateKey()

Deno.test('encryptToken → decryptToken roundtrips a string', () => {
  const plaintext = 'phn_access_token_abcdef123456'
  const ct = encryptToken(plaintext, key)
  assertEquals(decryptToken(ct, key), plaintext)
})

Deno.test('encryptToken yields different ciphertext for same plaintext (IV randomized)', () => {
  const plaintext = 'same input'
  assertNotEquals(encryptToken(plaintext, key), encryptToken(plaintext, key))
})

Deno.test('decryptToken with wrong key throws', () => {
  const other = generateKey()
  const ct = encryptToken('hello', key)
  assertThrows(() => decryptToken(ct, other))
})

Deno.test('decryptToken on tampered ciphertext throws (auth tag)', () => {
  const ct = encryptToken('hello', key)
  const buf = Buffer.from(ct, 'base64')
  buf[buf.length - 1] ^= 0xff
  const tampered = buf.toString('base64')
  assertThrows(() => decryptToken(tampered, key))
})

Deno.test('generateKey returns a 32-byte base64 string', () => {
  const k = generateKey()
  assertEquals(Buffer.from(k, 'base64').length, 32)
})
