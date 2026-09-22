import { assertEquals } from '@std/assert'
import { canonicalRoleNames, groupRoleAndScopes } from './roles.ts'

Deno.test('canonicalRoleNames expands kebab scopes, source users and implied roles', () => {
  assertEquals(
    canonicalRoleNames('role.researcher.DEMO', ['role.researcher.DEMO', 'source-user-ds1', 'cohort-reader']),
    ['role.researcher.DEMO', 'Source user (ds1)', 'cohort reader']
  )
  assertEquals(canonicalRoleNames('role.systemadmin', ['role.systemadmin']), ['role.systemadmin', 'admin'])
  assertEquals(canonicalRoleNames('role.viewer', ['role.viewer']), ['role.viewer', 'anonymous'])
})

Deno.test('groupRoleAndScopes maps an internal role to its canonical name', () => {
  assertEquals(groupRoleAndScopes({ role: 'ALP_USER_ADMIN' }), {
    role: 'role.useradmin',
    scopes: ['role.useradmin']
  })
  assertEquals(groupRoleAndScopes({ role: 'TENANT_ADMIN' }), { role: 'TENANT_ADMIN', scopes: ['TENANT_ADMIN'] })
})

Deno.test('groupRoleAndScopes scopes a researcher to the dataset code, with WebAPI extras for webapi datasets', () => {
  assertEquals(groupRoleAndScopes({ role: 'RESEARCHER', studyId: 'ds1' }, { tokenDatasetCode: 'DEMO', type: 'webapi' }), {
    role: 'role.researcher.DEMO',
    scopes: ['role.researcher.DEMO', 'role.researcher.ds1', 'source-user-ds1', 'cohort-reader', 'cohort-creator', 'concept-set-creator']
  })
  assertEquals(groupRoleAndScopes({ role: 'RESEARCHER', studyId: 'ds1' }, { tokenDatasetCode: 'DEMO' }), {
    role: 'role.researcher.DEMO',
    scopes: ['role.researcher.DEMO', 'role.researcher.ds1']
  })
})

Deno.test('groupRoleAndScopes yields nothing for a researcher whose dataset has no code', () => {
  assertEquals(groupRoleAndScopes({ role: 'RESEARCHER', studyId: 'ds1' }, null), null)
  assertEquals(groupRoleAndScopes({ role: 'RESEARCHER', studyId: 'ds1' }, { tokenDatasetCode: null }), null)
})
