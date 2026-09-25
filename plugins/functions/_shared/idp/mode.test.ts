import { assertEquals } from '@std/assert'
import { mayRekeyExistingSubject, resolveIdpMode } from './mode.ts'

Deno.test('resolveIdpMode accepts only the two modes, defaulting to trex', () => {
  assertEquals(resolveIdpMode('logto-federated'), 'logto-federated')
  assertEquals(resolveIdpMode('trex'), 'trex')
  for (const raw of [undefined, '', 'logto', 'LOGTO-FEDERATED']) assertEquals(resolveIdpMode(raw), 'trex')
})

Deno.test('a row without a subject may always be linked', () => {
  assertEquals(mayRekeyExistingSubject(null, 'logto-federated'), true)
  assertEquals(mayRekeyExistingSubject('', 'trex'), true)
})

Deno.test('a row that already has a subject is re-keyed by name only in trex mode', () => {
  assertEquals(mayRekeyExistingSubject('logto-sub', 'trex'), true)
  assertEquals(mayRekeyExistingSubject('logto-sub', 'logto-federated'), false)
})
