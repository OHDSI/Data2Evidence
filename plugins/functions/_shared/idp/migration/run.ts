import type { IdpMode } from '../mode.ts'
import { canonicalRoleNames, groupRoleAndScopes } from '../roles.ts'
import type { FederationAdmin } from './federation-admin.ts'
import { planLinks } from './plan.ts'
import type {
  GroupRow, LogtoUserRow, SkippedUser, StepName, StepStatus, SubjectHistoryRow, UsermgmtUserRow
} from './types.ts'

export const LOGTO_PROVIDER_ID = 'logto'

export interface MigrationStore {
  logtoAvailable(): Promise<boolean>
  usermgmtUsers(): Promise<UsermgmtUserRow[]>
  logtoUsers(): Promise<LogtoUserRow[]>
  subjectHistory(): Promise<SubjectHistoryRow[]>
  groups(): Promise<GroupRow[]>
  rekey(usermgmtId: string, oldSub: string | null, newSub: string): Promise<void>
  recordStep(step: StepName, status: StepStatus, counts: Record<string, number>, detail: unknown): Promise<void>
}

export interface MigrationConfig {
  mode: IdpMode
  logtoIssuer: string
  clientId: string
  clientSecret: string
  /** Public origin a browser uses, e.g. https://d2e.example:443 (TREX_OIDC_ISSUER). */
  publicOrigin: string
  userDomain: string
}

export interface MigrationSummary {
  mode: IdpMode
  linked: number
  created: number
  alreadyLinked: number
  skipped: SkippedUser[]
  rolesAssigned: number
  rekeyed: number
}

const statusOf = (failures: number, total: number): StepStatus =>
  failures === 0 ? 'ok' : failures < total ? 'partial' : 'failed'

export async function runIdpMigration(
  cfg: MigrationConfig,
  store: MigrationStore,
  admin: FederationAdmin,
  log: (msg: string) => void = msg => console.log(msg)
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    mode: cfg.mode, linked: 0, created: 0, alreadyLinked: 0, skipped: [], rolesAssigned: 0, rekeyed: 0
  }

  if (cfg.mode === 'trex') {
    // Leaving federated mode: take the button away. Links and history stay, so
    // switching back works.
    const result = await admin.setProviderEnabled(LOGTO_PROVIDER_ID, false)
    if (result === 'ok') log('[idp-migration] trex mode: Logto provider disabled')
    return summary
  }

  // 1. provider
  if (!(await store.logtoAvailable())) {
    await store.recordStep('provider', 'skipped', {}, { reason: 'logto.users not found; nothing to migrate' })
    log('[idp-migration] provider: skipped, no Logto data in this database')
    return summary
  }
  if (!cfg.clientId || !cfg.clientSecret || !cfg.logtoIssuer || !cfg.publicOrigin) {
    await store.recordStep('provider', 'failed', {}, {
      reason: 'set D2E__LOGTO_UPSTREAM__CLIENT_ID, D2E__LOGTO_UPSTREAM__CLIENT_SECRET, LOGTO__ISSUER and TREX_OIDC_ISSUER'
    })
    log('[idp-migration] provider: failed, upstream client configuration is incomplete')
    return summary
  }
  await admin.upsertProvider(LOGTO_PROVIDER_ID, {
    displayName: 'Logto',
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    issuer: cfg.logtoIssuer,
    authorizationEndpoint: `${cfg.publicOrigin.replace(/\/+$/, '')}/oidc/auth`,
    scopes: 'openid profile email',
    groupsSource: 'none',
    autoProvision: false,
    enabled: true
  })
  await store.recordStep('provider', 'ok', {}, {})
  log('[idp-migration] provider: Logto registered')

  // 2. link
  const plan = planLinks(await store.usermgmtUsers(), await store.logtoUsers(), await store.subjectHistory(), cfg.userDomain)
  summary.skipped.push(...plan.skipped)
  const trexIdByUsermgmt = new Map<string, string>()
  let linkFailures = 0
  for (const link of plan.links) {
    try {
      const out = await admin.link({
        providerId: LOGTO_PROVIDER_ID, accountId: link.logtoId, email: link.email, name: link.name, banned: link.banned
      })
      if ('conflict' in out) {
        linkFailures++
        summary.skipped.push({ usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'email_linked_elsewhere', detail: out.userId })
        continue
      }
      trexIdByUsermgmt.set(link.usermgmtId, out.userId)
      if (out.outcome === 'created') summary.created++
      else if (out.outcome === 'linked') summary.linked++
      else summary.alreadyLinked++
    } catch (err) {
      linkFailures++
      summary.skipped.push({ usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'link_failed', detail: String(err) })
    }
  }
  await store.recordStep('link', statusOf(linkFailures + plan.skipped.length, plan.links.length + plan.skipped.length), {
    linked: summary.linked, created: summary.created, alreadyLinked: summary.alreadyLinked,
    skipped: summary.skipped.length, notLogto: plan.notLogto
  }, { skipped: summary.skipped })
  log(`[idp-migration] link: linked ${summary.linked}, created ${summary.created}, already ${summary.alreadyLinked}, skipped ${summary.skipped.length} (see d2e migrate-idp-roles --report)`)

  // 3. roles
  const groups = await store.groups()
  let roleFailures = 0
  let roleAttempts = 0
  for (const [usermgmtId, trexId] of trexIdByUsermgmt) {
    const names = new Set<string>()
    for (const g of groups.filter(g => g.userId === usermgmtId)) {
      const built = groupRoleAndScopes(
        { role: g.role, studyId: g.studyId },
        g.studyId ? { tokenDatasetCode: g.tokenDatasetCode, type: g.datasetType } : null
      )
      if (built) for (const n of canonicalRoleNames(built.role, built.scopes)) names.add(n)
    }
    for (const name of names) {
      roleAttempts++
      try {
        await admin.assignRole(trexId, name)
        summary.rolesAssigned++
      } catch (err) {
        roleFailures++
        summary.skipped.push({ usermgmtId, username: '', logtoId: '', reason: 'role_failed', detail: `${name}: ${err}` })
      }
    }
  }
  await store.recordStep('roles', statusOf(roleFailures, roleAttempts), { assigned: summary.rolesAssigned, failed: roleFailures }, {})
  log(`[idp-migration] roles: assigned ${summary.rolesAssigned}, failed ${roleFailures}`)

  // 4. rekey
  let rekeyFailures = 0
  let rekeyAttempts = 0
  for (const link of plan.links) {
    const trexId = trexIdByUsermgmt.get(link.usermgmtId)
    if (!trexId || link.currentIdpUserId === trexId) continue
    rekeyAttempts++
    try {
      await store.rekey(link.usermgmtId, link.currentIdpUserId, trexId)
      summary.rekeyed++
    } catch (err) {
      rekeyFailures++
      summary.skipped.push({ usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'rekey_failed', detail: String(err) })
    }
  }
  await store.recordStep('rekey', statusOf(rekeyFailures, rekeyAttempts), { rekeyed: summary.rekeyed, failed: rekeyFailures }, {})
  log(`[idp-migration] rekey: re-keyed ${summary.rekeyed}, failed ${rekeyFailures}`)

  return summary
}
