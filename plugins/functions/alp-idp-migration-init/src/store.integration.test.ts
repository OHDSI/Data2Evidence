// Opt-in: TEST_PG_URL=postgres://postgres:pw@localhost:55434/postgres
import { assertEquals } from 'jsr:@std/assert'
import knex from 'knex'
import { KnexMigrationStore } from './store.ts'

const url = Deno.env.get('TEST_PG_URL')

// usermgmt."user".id is uuid in the real schema, and idp_subject_history.user_id
// (created by the migration under test) follows that type, so this scratch
// user id has to be a valid uuid, and the column below is declared uuid too,
// to exercise the same comparison/casting the store runs in production.
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
      await k.raw(`create table usermgmt."user" (id uuid primary key, username text, idp_user_id text)`)
      await k.raw(`create table usermgmt.b2c_group (id text primary key, role text, study_id text)`)
      await k.raw(`create table usermgmt.user_group (user_id uuid, b2c_group_id text)`)
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

      // No portal schema/table (e.g. a bare-trex deployment without the portal
      // plugin installed): groups() still resolves memberships, just without
      // the dataset-derived columns.
      await k.raw(`drop table portal.dataset`)
      assertEquals(await store.groups(), [{ userId: USER_ID, role: 'RESEARCHER', studyId: 'ds1', tokenDatasetCode: null, datasetType: null }])

      await store.rekey(USER_ID, 'l1', 'trex-1')
      await store.rekey(USER_ID, 'l1', 'trex-1') // a repeat is a no-op, not a second history row
      assertEquals((await k.raw(`select idp_user_id from usermgmt."user" where id=?`, [USER_ID])).rows[0].idp_user_id, 'trex-1')
      assertEquals(await store.subjectHistory(), [{ userId: USER_ID, oldSub: 'l1', newSub: 'trex-1' }])

      // The caller's `oldSub` is stale here ('WRONG-STALE-SUB'): the row
      // actually holds 'trex-1'. rekey must record what the row held, not
      // what it was told, since the next boot's origin trace depends on it.
      await store.rekey(USER_ID, 'WRONG-STALE-SUB', 'trex-2')
      assertEquals((await k.raw(`select idp_user_id from usermgmt."user" where id=?`, [USER_ID])).rows[0].idp_user_id, 'trex-2')
      assertEquals(await store.subjectHistory(), [
        { userId: USER_ID, oldSub: 'l1', newSub: 'trex-1' },
        { userId: USER_ID, oldSub: 'trex-1', newSub: 'trex-2' }
      ])

      await store.recordStep('link', 'ok', { linked: 1 }, {})
      await store.recordStep('link', 'partial', { linked: 0 }, { skipped: [] })
      const steps = (await k.raw(`select step, status, counts from usermgmt.idp_migration`)).rows
      assertEquals(steps, [{ step: 'link', status: 'partial', counts: { linked: 0 } }])
    } finally {
      await k.destroy()
    }
  }
})

// The fixture above creates logto.users without row-level security, which is
// exactly why the RLS failure reached a real installation unnoticed. This
// test reproduces the production shape: logto.users owned by Logto's own role,
// RLS enabled, and a RESTRICTIVE policy keyed on logto.tenants.db_user =
// CURRENT_USER. Both roles are ordinary (non-superuser) logins, because a
// superuser bypasses every policy and would prove nothing.
const ROLE_PASSWORD = 'idp-migration-test'
const LOGTO_OWNER = 'idp_test_logto_owner'
const USERMGMT_ADMIN = 'idp_test_usermgmt_admin'

Deno.test({
  name: 'row-level security hides logto.users from the usermgmt admin role, and not from the Logto owner',
  ignore: !url,
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const asRole = (role: string) => {
      const u = new URL(url!)
      u.username = role
      u.password = ROLE_PASSWORD
      return u.href
    }
    const k = knex({ client: 'pg', connection: url })
    let owner: ReturnType<typeof knex> | undefined
    let admin: ReturnType<typeof knex> | undefined
    try {
      await k.raw(`drop schema if exists logto cascade`)
      for (const role of [LOGTO_OWNER, USERMGMT_ADMIN]) {
        await k.raw(`
          do $$ begin
            if exists (select 1 from pg_roles where rolname = '${role}') then
              execute 'drop owned by ${role} cascade';
              execute 'drop role ${role}';
            end if;
          end $$`)
        await k.raw(`create role ${role} login password '${ROLE_PASSWORD}'`)
      }

      await k.raw(`create schema logto authorization ${LOGTO_OWNER}`)
      await k.raw(`create table logto.tenants (id text primary key, db_user text)`)
      await k.raw(`create table logto.users (tenant_id text, id text, username text, primary_email text, name text, is_suspended boolean)`)
      await k.raw(`alter table logto.tenants owner to ${LOGTO_OWNER}`)
      await k.raw(`alter table logto.users owner to ${LOGTO_OWNER}`)
      await k.raw(`insert into logto.tenants values ('default', 'logto_tenant_alp_default'), ('admin', 'logto_tenant_alp_admin')`)
      await k.raw(`insert into logto.users values ('default','l1','admin',null,'Admin',false)`)
      await k.raw(`alter table logto.users enable row level security`)
      await k.raw(`
        create policy tenant_isolation on logto.users as restrictive
        using (tenant_id = (select id from logto.tenants where db_user = current_user))`)
      await k.raw(`grant usage on schema logto to ${USERMGMT_ADMIN}`)
      await k.raw(`grant select on logto.users, logto.tenants to ${USERMGMT_ADMIN}`)

      owner = knex({ client: 'pg', connection: asRole(LOGTO_OWNER) })
      admin = knex({ client: 'pg', connection: asRole(USERMGMT_ADMIN) })

      // The defect: the admin role satisfies no tenant row, so it reads the
      // table as empty — with no error to give the problem away.
      const withoutOwner = new KnexMigrationStore(admin, admin)
      assertEquals(await withoutOwner.logtoAvailable(), true)
      assertEquals(await withoutOwner.logtoUsers(), [])

      // The fix: the table's owner bypasses the policy (relforcerowsecurity
      // is false), so the same read on the Logto connection sees the row.
      const withOwner = new KnexMigrationStore(admin, owner)
      assertEquals(await withOwner.logtoUsers(), [
        { id: 'l1', username: 'admin', primaryEmail: null, name: 'Admin', isSuspended: false }
      ])
    } finally {
      await owner?.destroy()
      await admin?.destroy()
      await k.raw(`drop schema if exists logto cascade`).catch(() => {})
      for (const role of [LOGTO_OWNER, USERMGMT_ADMIN]) {
        await k.raw(`drop owned by ${role} cascade`).catch(() => {})
        await k.raw(`drop role if exists ${role}`).catch(() => {})
      }
      await k.destroy()
    }
  }
})
