import { assertEquals, assertArrayIncludes } from 'jsr:@std/assert'
import { PhysionetReconcileService } from './PhysionetReconcileService.ts'

type Grant = { groupId: string; createdBy: string }
interface GatedSpec {
  datasetId: string; studyGroupId: string; slug: string; version: string
  access: 'ok-yes' | 'ok-no' | 'upstream' | 'invalid'
}

function makeDeps(opts: {
  link: { userId: string; tokenValid: boolean } | null
  gated: GatedSpec[]
  initialGrants: Grant[]
}) {
  const grants: Grant[] = [...opts.initialGrants]
  const events: string[] = []

  const linkedSvc = {
    getDecryptedAccessToken: async () => opts.link?.tokenValid ? 'AT' : null,
  }
  const linkedRepo = {
    findByUserAndProvider: async () => opts.link ? { id: 'la-1', userId: opts.link.userId } : null,
    updateSyncStatus: async (_id: string, syncedAt: Date | null, err: string | null) => {
      events.push(`sync:${err ?? 'ok'}${syncedAt ? '@ts' : ''}`)
    },
  }
  const groupSvc = {
    registerUserToGroup: async (_u: string, gid: string, _trx: any, opts2: any) => {
      // Existing service short-circuits if row exists — emulate that:
      const exists = grants.find(g => g.groupId === gid && g.createdBy === opts2.createdByOverride)
      if (exists) { events.push(`grant-skip:${gid}`); return }
      grants.push({ groupId: gid, createdBy: opts2.createdByOverride })
      events.push(`grant:${gid}`)
    },
    withdrawAllByProvenance: async (_u: string, prov: string) => {
      const before = grants.length
      for (let i = grants.length - 1; i >= 0; i--) if (grants[i].createdBy === prov) grants.splice(i, 1)
      events.push(`revoke-all:${prov}:${before - grants.length}`)
    },
    withdrawUserFromGroups: async (_u: string, gids: string[]) => {
      for (const gid of gids) {
        for (let i = grants.length - 1; i >= 0; i--) {
          if (grants[i].groupId === gid && grants[i].createdBy === 'physionet_sync') {
            grants.splice(i, 1)
          }
        }
      }
      events.push(`revoke:${gids.join(',')}`)
    },
  }
  const datasetQuery = {
    listGated: async () => opts.gated.map(g => ({
      datasetId: g.datasetId, tenantId: 't', studyGroupId: g.studyGroupId, slug: g.slug, version: g.version,
    })),
  }
  const api = {
    checkDatasetAccess: async ({ slug, version }: any) => {
      const d = opts.gated.find(d => d.slug === slug && d.version === version)
      switch (d?.access) {
        case 'ok-yes': return { kind: 'ok', hasAccess: true }
        case 'ok-no': return { kind: 'ok', hasAccess: false }
        case 'upstream': return { kind: 'upstream_error' }
        case 'invalid': return { kind: 'invalid_token' }
        default: return { kind: 'upstream_error' }
      }
    },
  }
  return { grants, events, deps: { linkedSvc, linkedRepo, groupSvc, datasetQuery, api } }
}

function makeSvc(deps: any) {
  return new PhysionetReconcileService(
    deps.linkedSvc, deps.linkedRepo, deps.groupSvc, deps.datasetQuery, deps.api,
    /* db */ undefined,
  )
}

Deno.test('no linked account → noop', async () => {
  const t = makeDeps({ link: null, gated: [], initialGrants: [] })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.events, [])
})

Deno.test('ACCESS grants when no existing grant', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [{ datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'ok-yes' }],
    initialGrants: [],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 1)
  assertEquals(t.grants[0].createdBy, 'physionet_sync')
  assertEquals(t.grants[0].groupId, 'g1')
})

Deno.test('ACCESS is idempotent when row already exists', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [{ datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'ok-yes' }],
    initialGrants: [{ groupId: 'g1', createdBy: 'physionet_sync' }],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 1)
})

Deno.test('NO_ACCESS revokes the physionet_sync row', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [{ datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'ok-no' }],
    initialGrants: [
      { groupId: 'g1', createdBy: 'physionet_sync' },
      { groupId: 'g1', createdBy: 'admin-1' },
    ],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 1)
  assertEquals(t.grants[0].createdBy, 'admin-1')
})

Deno.test('UPSTREAM_ERROR leaves existing physionet_sync grant and records error', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [{ datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'upstream' }],
    initialGrants: [{ groupId: 'g1', createdBy: 'physionet_sync' }],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 1)
  assertArrayIncludes(t.events, ['sync:1 datasets failed@ts'])
})

Deno.test('LINK_DEAD revokes ALL physionet_sync grants and exits early', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [
      { datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'invalid' },
      { datasetId: 'd2', studyGroupId: 'g2', slug: 's2', version: 'v2', access: 'ok-yes' }, // should NOT be processed
    ],
    initialGrants: [{ groupId: 'g1', createdBy: 'physionet_sync' }, { groupId: 'g2', createdBy: 'physionet_sync' }],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 0)
  assertArrayIncludes(t.events, ['revoke-all:physionet_sync:2', 'sync:link revoked upstream'])
})

Deno.test('Token retrieval fails (null) → treated as LINK_DEAD', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: false },
    gated: [],
    initialGrants: [{ groupId: 'g1', createdBy: 'physionet_sync' }],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 0)
  assertArrayIncludes(t.events, ['revoke-all:physionet_sync:1', 'sync:link revoked upstream'])
})

Deno.test('Mixed: one upstream + one ok-yes records partial failure but still grants the OK one', async () => {
  const t = makeDeps({
    link: { userId: 'u1', tokenValid: true },
    gated: [
      { datasetId: 'd1', studyGroupId: 'g1', slug: 's1', version: 'v1', access: 'upstream' },
      { datasetId: 'd2', studyGroupId: 'g2', slug: 's2', version: 'v2', access: 'ok-yes' },
    ],
    initialGrants: [],
  })
  await makeSvc(t.deps).reconcile('u1')
  assertEquals(t.grants.length, 1)
  assertEquals(t.grants[0].groupId, 'g2')
  assertArrayIncludes(t.events, ['sync:1 datasets failed@ts'])
})
