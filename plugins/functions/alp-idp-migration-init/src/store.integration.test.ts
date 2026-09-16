// Opt-in: TEST_PG_URL=postgres://postgres:pw@localhost:55434/postgres
import { assertEquals } from 'jsr:@std/assert'
import knex from 'knex'
import { KnexMigrationStore } from './store.ts'

const url = Deno.env.get('TEST_PG_URL')

// usermgmt."user".id is uuid in the real schema, and idp_subject_history.user_id
// (created by the migration under test) follows that type, so this scratch
// user id has to be a valid uuid even though the column below is declared text.
const USER_ID = '11111111-1111-1111-1111-111111111111'

Deno.test({
  name: 'KnexMigrationStore reads Logto and usermgmt rows and re-keys with history',
  ignore: !url,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const k = knex({ client: 'pg', connection: url })
    try {
      await k.raw(`drop schema if exists usermgmt cascade; drop schema if exists logto cascade; drop schema if exists portal cascade`)
      await k.raw(`create schema usermgmt; create schema logto; create schema portal`)
      await k.raw(`create table usermgmt."user" (id text primary key, username text, idp_user_id text)`)
      await k.raw(`create table usermgmt.b2c_group (id text primary key, role text, study_id text)`)
      await k.raw(`create table usermgmt.user_group (user_id text, b2c_group_id text)`)
      await k.raw(`create table portal.dataset (id text primary key, token_dataset_code text, type text)`)
      await k.raw(`create table logto.users (tenant_id text, id text, username text, primary_email text, name text, is_suspended boolean)`)
      const { up } = await import('../../alp-usermgmt-init/src/db/migrations/20260916120000_idp_migration_tables.ts')
      await up(k as any)

      await k.raw(`insert into usermgmt."user" values (?, 'admin', 'l1')`, [USER_ID])
      await k.raw(`insert into usermgmt.b2c_group values ('g1','RESEARCHER','ds1')`)
      await k.raw(`insert into usermgmt.user_group values (?, 'g1')`, [USER_ID])
      await k.raw(`insert into portal.dataset values ('ds1','DEMO','webapi')`)
      await k.raw(`insert into logto.users values ('default','l1','admin',null,'Admin',false), ('admin','x1','console',null,null,false)`)

      const store = new KnexMigrationStore(k)
      assertEquals(await store.logtoAvailable(), true)
      assertEquals(await store.logtoUsers(), [{ id: 'l1', username: 'admin', primaryEmail: null, name: 'Admin', isSuspended: false }])
      assertEquals(await store.usermgmtUsers(), [{ id: USER_ID, username: 'admin', idpUserId: 'l1' }])
      assertEquals(await store.groups(), [{ userId: USER_ID, role: 'RESEARCHER', studyId: 'ds1', tokenDatasetCode: 'DEMO', datasetType: 'webapi' }])

      await store.rekey(USER_ID, 'l1', 'trex-1')
      await store.rekey(USER_ID, 'l1', 'trex-1') // a repeat is a no-op, not a second history row
      assertEquals((await k.raw(`select idp_user_id from usermgmt."user" where id=?`, [USER_ID])).rows[0].idp_user_id, 'trex-1')
      assertEquals(await store.subjectHistory(), [{ userId: USER_ID, oldSub: 'l1', newSub: 'trex-1' }])

      await store.recordStep('link', 'ok', { linked: 1 }, {})
      await store.recordStep('link', 'partial', { linked: 0 }, { skipped: [] })
      const steps = (await k.raw(`select step, status, counts from usermgmt.idp_migration`)).rows
      assertEquals(steps, [{ step: 'link', status: 'partial', counts: { linked: 0 } }])
    } finally {
      await k.destroy()
    }
  }
})
