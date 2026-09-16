import { assertEquals } from 'jsr:@std/assert'
import type { Knex } from 'knex'
import { KnexMigrationStore } from './store.ts'

/**
 * A knex stand-in that records which connection each query ran on, so the
 * split between the usermgmt admin connection and the Logto one is visible
 * without a database.
 */
function fakeKnex(name: string, seen: Array<[string, string]>, rows: Record<string, unknown>[] = []): Knex {
  return {
    raw: (sql: string) => {
      seen.push([name, sql.trim().split('\n')[0].trim()])
      return Promise.resolve({ rows })
    }
  } as unknown as Knex
}

Deno.test('the Logto read runs on the Logto connection when one is configured', async () => {
  const seen: Array<[string, string]> = []
  const logtoRow = { id: 'l1', username: 'admin', primaryEmail: null, name: 'Admin', isSuspended: false }
  const store = new KnexMigrationStore(fakeKnex('admin', seen), fakeKnex('logto', seen, [logtoRow]))

  assertEquals(await store.logtoUsers(), [logtoRow])
  await store.logtoAvailable()

  assertEquals(seen.map(s => s[0]), ['logto', 'logto'])
})

Deno.test('the Logto read falls back to the admin connection when none is configured', async () => {
  const seen: Array<[string, string]> = []
  const store = new KnexMigrationStore(fakeKnex('admin', seen))

  await store.logtoUsers()
  await store.logtoAvailable()

  assertEquals(seen.map(s => s[0]), ['admin', 'admin'])
})

Deno.test('everything in usermgmt stays on the admin connection', async () => {
  const seen: Array<[string, string]> = []
  const store = new KnexMigrationStore(fakeKnex('admin', seen), fakeKnex('logto', seen))

  await store.migrationTablesExist()
  await store.usermgmtUsers()
  await store.subjectHistory()
  await store.groups()
  await store.recordStep('link', 'ok', {}, {})

  assertEquals(new Set(seen.map(s => s[0])), new Set(['admin']))
})

Deno.test('the bookkeeping probe requires both tables', async () => {
  const both = new KnexMigrationStore(fakeKnex('admin', [], [{ m: 'usermgmt.idp_migration', h: 'usermgmt.idp_subject_history' }]))
  const onlyOne = new KnexMigrationStore(fakeKnex('admin', [], [{ m: 'usermgmt.idp_migration', h: null }]))

  assertEquals(await both.migrationTablesExist(), true)
  assertEquals(await onlyOne.migrationTablesExist(), false)
})
