import { assertEquals } from 'jsr:@std/assert'
import { Repository } from './Repository.ts'

// Minimal concrete subclass for testing Repository.create directly.
// Name must end with 'Repository' so that getTableName() derives a valid table name ('test').
class TestRepository extends Repository<{ id: string; created_by: string; modified_by: string }, { id: string }> {
  reducer(row: any) {
    return row
  }
}

// Build a Knex-like fake that records the .insert() payload
function fakeKnex() {
  let captured: any = null
  const fn: any = (_table: string) => ({
    insert: (rows: any[]) => ({
      returning: (_: string) => {
        captured = rows[0]
        return Promise.resolve([rows[0]])
      },
    }),
  })
  // expose captured record via closure
  fn.captured = () => captured
  return fn
}

Deno.test('Repository.create — no override uses requesting user id', async () => {
  const db = fakeKnex()
  const repo = new TestRepository(db as any)
  await repo.create({ id: 'r1' }, { userId: 'requester-1' } as any)
  assertEquals(db.captured().created_by, 'requester-1')
  assertEquals(db.captured().modified_by, 'requester-1')
})

Deno.test('Repository.create — override sets created_by/modified_by', async () => {
  const db = fakeKnex()
  const repo = new TestRepository(db as any)
  await repo.create({ id: 'r1' }, { userId: 'requester-1' } as any, undefined, {
    createdBy: 'physionet_sync',
    modifiedBy: 'physionet_sync',
  })
  assertEquals(db.captured().created_by, 'physionet_sync')
  assertEquals(db.captured().modified_by, 'physionet_sync')
})

Deno.test('Repository.create — partial override uses userId for unset fields', async () => {
  const db = fakeKnex()
  const repo = new TestRepository(db as any)
  await repo.create({ id: 'r1' }, { userId: 'requester-1' } as any, undefined, {
    createdBy: 'physionet_sync',
    // modifiedBy not set — should fall back to userId
  })
  assertEquals(db.captured().created_by, 'physionet_sync')
  assertEquals(db.captured().modified_by, 'requester-1')
})
