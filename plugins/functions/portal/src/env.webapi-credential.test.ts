import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { pickWebApiCredential } from './env.ts'

const read = { username: 'postgres_tenant_read_user', password: 'r', userScope: 'Read' }
const admin = { username: 'postgres_tenant_admin_user', password: 'a', userScope: 'Admin' }

describe('pickWebApiCredential', () => {
  it('prefers the Admin credential so Atlas can write to the results schema', () => {
    assertEquals(pickWebApiCredential('db', [read, admin]), admin)
  })

  it('falls back to the Read credential when no Admin credential exists', () => {
    assertEquals(pickWebApiCredential('db', [read]), read)
  })

  it('falls back to the first credential when neither scope is present', () => {
    const other = { username: 'u', password: 'p', userScope: 'Other' }
    assertEquals(pickWebApiCredential('db', [other]), other)
  })

  it('returns undefined when the database has no credentials', () => {
    assertEquals(pickWebApiCredential('db', undefined), undefined)
    assertEquals(pickWebApiCredential('db', []), undefined)
  })
})
