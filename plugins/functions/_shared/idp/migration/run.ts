import type { IdpMode } from '../mode.ts'
import { canonicalRoleNames, groupRoleAndScopes } from '../roles.ts'
import type { FederationAdmin } from './federation-admin.ts'
import { planLinks } from './plan.ts'
import type {
  GroupRow, LinkPlan, LogtoUserRow, SkippedUser, StepName, StepStatus, SubjectHistoryRow, UsermgmtUserRow
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

// `failed` counts attempts that actually errored (a real problem trex or the
// store reported); `skipped` counts entries that were never attempted because
// the plan excluded them for data reasons (no_email, duplicate_email, ...).
// Those are different situations: an install with only data-quality skips and
// zero real failures must not read as permanently 'failed'.
const statusOf = (failed: number, skipped: number, total: number): StepStatus => {
  if (failed === 0 && skipped === 0) return 'ok'
  if (failed === 0) return 'skipped'
  return failed < total ? 'partial' : 'failed'
}

// Records a step's outcome. Best-effort: if the store itself can't persist
// the record, that must not replace or mask the error the step is reporting.
async function safeRecordStep(
  store: MigrationStore, step: StepName, status: StepStatus, counts: Record<string, number>, detail: unknown, log: (msg: string) => void
): Promise<void> {
  try {
    await store.recordStep(step, status, counts, detail)
  } catch (err) {
    log(`[idp-migration] ${step}: failed to record step status: ${err}`)
  }
}

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
    // switching back works. There is no step row in this mode, so a failure
    // here is only logged.
    try {
      const result = await admin.setProviderEnabled(LOGTO_PROVIDER_ID, false)
      if (result === 'ok') log('[idp-migration] trex mode: Logto provider disabled')
      else log('[idp-migration] trex mode: Logto provider is unknown to trex (check TREX__FEDERATION_ADMIN_URL)')
    } catch (err) {
      log(`[idp-migration] trex mode: failed to disable the Logto provider: ${err}`)
    }
    return summary
  }

  // 1. provider
  let logtoAvailable: boolean
  try {
    logtoAvailable = await store.logtoAvailable()
  } catch (err) {
    await safeRecordStep(store, 'provider', 'failed', {}, { reason: String(err) }, log)
    log(`[idp-migration] provider: failed, ${err}`)
    return summary
  }
  if (!logtoAvailable) {
    await safeRecordStep(store, 'provider', 'skipped', {}, { reason: 'logto.users not found; nothing to migrate' }, log)
    log('[idp-migration] provider: skipped, no Logto data in this database')
    return summary
  }
  if (!cfg.clientId || !cfg.clientSecret || !cfg.logtoIssuer || !cfg.publicOrigin) {
    await safeRecordStep(store, 'provider', 'failed', {}, {
      reason: 'set D2E__LOGTO_UPSTREAM__CLIENT_ID, D2E__LOGTO_UPSTREAM__CLIENT_SECRET, LOGTO__ISSUER and TREX_OIDC_ISSUER'
    }, log)
    log('[idp-migration] provider: failed, upstream client configuration is incomplete')
    return summary
  }
  try {
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
  } catch (err) {
    await safeRecordStep(store, 'provider', 'failed', {}, { reason: String(err) }, log)
    log(`[idp-migration] provider: failed, ${err}`)
    return summary
  }
  await safeRecordStep(store, 'provider', 'ok', {}, {}, log)
  log('[idp-migration] provider: Logto registered')

  // 2. link
  let plan: LinkPlan
  try {
    const [usermgmt, logto, history] = await Promise.all([store.usermgmtUsers(), store.logtoUsers(), store.subjectHistory()])
    plan = planLinks(usermgmt, logto, history, cfg.userDomain)
  } catch (err) {
    await safeRecordStep(store, 'link', 'failed', {}, { reason: String(err) }, log)
    log(`[idp-migration] link: failed, ${err}`)
    return summary
  }
  summary.skipped.push(...plan.skipped)
  const trexIdByUsermgmt = new Map<string, string>()
  const linkByUsermgmt = new Map(plan.links.map(l => [l.usermgmtId, l]))
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
  await safeRecordStep(store, 'link', statusOf(linkFailures, plan.skipped.length, plan.links.length), {
    linked: summary.linked, created: summary.created, alreadyLinked: summary.alreadyLinked,
    skipped: summary.skipped.length, notLogto: plan.notLogto
  }, { skipped: [...summary.skipped] }, log)
  log(`[idp-migration] link: linked ${summary.linked}, created ${summary.created}, already ${summary.alreadyLinked}, skipped ${summary.skipped.length} (see d2e migrate-idp-roles --report)`)

  // 3. roles
  let groups: GroupRow[] = []
  let groupsFetchFailed = false
  try {
    groups = await store.groups()
  } catch (err) {
    groupsFetchFailed = true
    await safeRecordStep(store, 'roles', 'failed', {}, { reason: String(err) }, log)
    log(`[idp-migration] roles: failed, ${err}`)
  }
  if (!groupsFetchFailed) {
    let roleFailures = 0
    let roleAttempts = 0
    const roleSkips: SkippedUser[] = []
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
          const link = linkByUsermgmt.get(usermgmtId)
          const entry: SkippedUser = {
            usermgmtId, username: link?.username ?? '', logtoId: link?.logtoId ?? '', reason: 'role_failed', detail: `${name}: ${err}`
          }
          roleSkips.push(entry)
          summary.skipped.push(entry)
        }
      }
    }
    await safeRecordStep(store, 'roles', statusOf(roleFailures, 0, roleAttempts), {
      assigned: summary.rolesAssigned, failed: roleFailures
    }, { skipped: roleSkips }, log)
    log(`[idp-migration] roles: assigned ${summary.rolesAssigned}, failed ${roleFailures}`)
  }

  // 4. rekey
  let rekeyFailures = 0
  let rekeyAttempts = 0
  const rekeySkips: SkippedUser[] = []
  for (const link of plan.links) {
    const trexId = trexIdByUsermgmt.get(link.usermgmtId)
    if (!trexId || link.currentIdpUserId === trexId) continue
    rekeyAttempts++
    try {
      await store.rekey(link.usermgmtId, link.currentIdpUserId, trexId)
      summary.rekeyed++
    } catch (err) {
      rekeyFailures++
      const entry: SkippedUser = { usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'rekey_failed', detail: String(err) }
      rekeySkips.push(entry)
      summary.skipped.push(entry)
    }
  }
  await safeRecordStep(store, 'rekey', statusOf(rekeyFailures, 0, rekeyAttempts), {
    rekeyed: summary.rekeyed, failed: rekeyFailures
  }, { skipped: rekeySkips }, log)
  log(`[idp-migration] rekey: re-keyed ${summary.rekeyed}, failed ${rekeyFailures}`)

  return summary
}
