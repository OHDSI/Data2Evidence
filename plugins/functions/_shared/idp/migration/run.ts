import type { IdpMode } from '../mode.ts'
import { canonicalRoleNames, groupRoleAndScopes } from '../roles.ts'
import type { FederationAdmin } from './federation-admin.ts'
import { planLinks } from './plan.ts'
import type {
  GroupRow, LinkPlan, LogtoUserRow, SkippedUser, StepName, StepStatus, SubjectHistoryRow, UsermgmtUserRow
} from './types.ts'

export const LOGTO_PROVIDER_ID = 'logto'

export interface MigrationStore {
  /** Whether usermgmt.idp_migration and usermgmt.idp_subject_history exist yet. */
  migrationTablesExist(): Promise<boolean>
  logtoAvailable(): Promise<boolean>
  usermgmtUsers(): Promise<UsermgmtUserRow[]>
  logtoUsers(): Promise<LogtoUserRow[]>
  subjectHistory(): Promise<SubjectHistoryRow[]>
  groups(): Promise<GroupRow[]>
  rekey(usermgmtId: string, oldSub: string | null, newSub: string): Promise<void>
  recordStep(step: StepName, status: StepStatus, counts: Record<string, number>, detail: unknown): Promise<void>
}

/** How long to wait for alp-usermgmt-init to create the bookkeeping tables. */
export interface TablesWait {
  budgetMs: number
  intervalMs: number
  sleep: (ms: number) => Promise<void>
}

// This function is registered `afterListen`, but that only orders it against
// trex's listen call — alp-usermgmt-init, which owns the DDL for
// usermgmt.idp_migration and usermgmt.idp_subject_history, applies its knex
// migrations concurrently and can lose the race. When it does, the provider
// step cannot record its status and the link step dies on a missing relation.
//
// 60s comfortably covers a cold first boot applying the whole usermgmt
// migration set, and still gives up visibly rather than hanging a start
// forever. 2s between polls costs at most one wasted round trip per second of
// waiting; anything tighter only adds log noise for no earlier start.
const DEFAULT_TABLES_WAIT: TablesWait = {
  budgetMs: 60_000,
  intervalMs: 2_000,
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms))
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
// the plan excluded them for data reasons (no_email, duplicate_email, ...);
// `total` counts only what was attempted (skipped entries are never in it).
// Those are different situations: an install with only data-quality skips and
// zero real failures must not read as permanently 'failed', and a run that
// linked hundreds of users with a handful of data-quality skips must not
// read as 'skipped' just because `failed` happens to be zero.
const statusOf = (failed: number, skipped: number, total: number): StepStatus => {
  if (failed > 0) return failed < total ? 'partial' : 'failed'
  if (skipped === 0) return 'ok'
  return total > 0 ? 'partial' : 'skipped'
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

/**
 * Polls for the bookkeeping tables until they exist or the budget runs out.
 *
 * Counts polls rather than watching the clock, so the budget means the same
 * thing when `sleep` is a test double as it does against a real timer. A
 * failing probe is not fatal on its own — the database itself may still be
 * coming up — so only the last error is reported, once, when giving up.
 */
async function waitForMigrationTables(
  store: MigrationStore, wait: TablesWait, log: (msg: string) => void
): Promise<boolean> {
  const polls = Math.max(1, Math.ceil(wait.budgetMs / wait.intervalMs))
  let lastError: unknown
  for (let i = 0; i < polls; i++) {
    try {
      if (await store.migrationTablesExist()) return true
      lastError = undefined
    } catch (err) {
      lastError = err
    }
    if (i < polls - 1) await wait.sleep(wait.intervalMs)
  }
  log(
    `[idp-migration] usermgmt.idp_migration / usermgmt.idp_subject_history did not appear within ${wait.budgetMs}ms; ` +
    'alp-usermgmt-init has not applied its migrations. Aborting; the next start retries' +
    (lastError === undefined ? '' : ` (last error: ${lastError})`)
  )
  return false
}

export async function runIdpMigration(
  cfg: MigrationConfig,
  store: MigrationStore,
  admin: FederationAdmin,
  log: (msg: string) => void = msg => console.log(msg),
  wait: TablesWait = DEFAULT_TABLES_WAIT
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    mode: cfg.mode, linked: 0, created: 0, alreadyLinked: 0, skipped: [], rolesAssigned: 0, rekeyed: 0
  }

  if (cfg.mode === 'trex') {
    // A fresh trex-only install (and every trex-mode CI/local run) has no
    // `logto` schema at all, so there is nothing to clean up: check that
    // before making any admin call. This matters independently of whether
    // trex is even listening yet — skipping the call here means a fresh
    // install never pays the admin client's retry budget for a call that
    // would have nothing to do anyway.
    let logtoAvailable: boolean
    try {
      logtoAvailable = await store.logtoAvailable()
    } catch (err) {
      log(`[idp-migration] trex mode: failed to check for Logto data: ${err}`)
      return summary
    }
    if (!logtoAvailable) return summary

    // Leaving federated mode: take the button away. Links and history stay, so
    // switching back works. There is no step row in this mode, so a failure
    // here is only logged. Short retry budget: unlike the migration itself,
    // this call has a real fallback (log and retry on the next boot), so it
    // should not hold up a trex-mode start for the migration-sized budget.
    try {
      const result = await admin.setProviderEnabled(LOGTO_PROVIDER_ID, false, { attempts: 2 })
      if (result === 'ok') log('[idp-migration] trex mode: Logto provider disabled')
      else log('[idp-migration] trex mode: Logto provider is unknown to trex')
    } catch (err) {
      log(`[idp-migration] trex mode: failed to disable the Logto provider: ${err}`)
    }
    return summary
  }

  // Every step below records its outcome in usermgmt.idp_migration, and the
  // re-keys write usermgmt.idp_subject_history. Running without them loses
  // the record of what the migration did — and the history a later boot
  // walks back through — so wait for them before touching anything. trex
  // mode returns above without needing either.
  if (!await waitForMigrationTables(store, wait, log)) return summary

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
    // The Logto schema is there (step 1 proved it) and usermgmt still holds
    // users carrying an IdP subject, yet the read came back with nothing.
    // That is not an empty installation: logto.users has a RESTRICTIVE
    // row-level policy keyed on logto.tenants.db_user = CURRENT_USER, so a
    // role other than Logto's own reads zero rows and no error. Left alone,
    // every one of those users falls into `notLogto` and the run reports a
    // clean no-op while nobody can sign in. Fail here instead.
    const withSubject = usermgmt.filter(u => u.idpUserId).length
    if (logto.length === 0 && withSubject > 0) {
      const reason =
        `logto.users is present but returned no rows while ${withSubject} usermgmt users still carry an IdP subject. ` +
        'The migration is almost certainly reading Logto with a database role that its row-level security blocks: ' +
        "set PG__LOGTO_MANAGER_USER / PG__LOGTO_MANAGER_PASSWORD to Logto's own role (the owner of logto.users), " +
        'or check that this function points at the database holding the Logto schema.'
      await safeRecordStep(store, 'link', 'failed', { usermgmtWithSubject: withSubject, logtoUsers: 0 }, { reason }, log)
      log(`[idp-migration] link: failed, ${reason}`)
      return summary
    }
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
  let subjectWouldChange = 0
  // Verified against trex (OHDSI/trex#318): PUT .../links never rewrites an
  // existing link's email, and applies `banned` only when true. So in
  // federated mode Logto stays the source of truth for suspension: an admin
  // who unbans someone in trex has that reverted on the next restart unless
  // they also un-suspend the person in Logto.
  //
  // Every link asks trex to keep the user under their Logto id. WebAPI's
  // sec_user, portal artifacts, jobplugins flows and the rest are keyed by
  // the token `sub` directly, not through usermgmt, so a user whose `sub`
  // changes signs in to find none of their own work.
  for (const link of plan.links) {
    try {
      const out = await admin.link({
        providerId: LOGTO_PROVIDER_ID, accountId: link.logtoId, userId: link.logtoId,
        email: link.email, name: link.name, banned: link.banned
      })
      if ('conflict' in out) {
        linkFailures++
        summary.skipped.push({ usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'email_linked_elsewhere', detail: out.userId })
        continue
      }
      // A trex that predates explicit-id linking ignores `userId` and answers
      // with a fresh UUID; one that has the account linked to another user
      // answers with that user. Either way the user would sign in under a
      // different `sub`, so the link does not count: no roles are copied to
      // that trex user and usermgmt is not moved onto it. trex may already
      // have created the account; it stays unused until this is resolved.
      if (out.userId !== link.logtoId) {
        linkFailures++
        subjectWouldChange++
        summary.skipped.push({ usermgmtId: link.usermgmtId, username: link.username, logtoId: link.logtoId, reason: 'subject_would_change', detail: out.userId })
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
    skipped: summary.skipped.length, subjectWouldChange, notLogto: plan.notLogto
  }, { skipped: [...summary.skipped] }, log)
  // `notLogto` used to be silent, so "linked 0, created 0, already 0,
  // skipped 0" read as a clean run on an installation where nothing had been
  // linked at all. Name it whenever it is the only thing that happened.
  const linkLine = `[idp-migration] link: linked ${summary.linked}, created ${summary.created}, already ${summary.alreadyLinked}, skipped ${summary.skipped.length}`
  // A subject mismatch is almost always the trex build, not the data: say so
  // in the line itself, since the run otherwise looks like a handful of skips.
  const subjectNote = subjectWouldChange > 0
    ? `; ${subjectWouldChange} would change subject and were not linked (subject_would_change) — this trex does not honour explicit-id linking, upgrade it`
    : ''
  log(plan.links.length === 0 && plan.notLogto > 0
    ? `${linkLine}: nothing was linked — ${plan.notLogto} usermgmt users hold a subject that is not a Logto identity and has no history leading back to one (see d2e migrate-idp-roles --report)`
    : `${linkLine}${subjectNote} (see d2e migrate-idp-roles --report)`)

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

  // 4. rekey: align usermgmt with the trex user id.
  //
  // The link step only counts a user trex keeps under their Logto id, so the
  // target here is that Logto id and, on an installation migrated by this
  // build, every row already holds it: nothing is written and no
  // idp_subject_history row appears. The step does real work only for a row
  // an earlier build moved to a trex UUID: planLinks traced it back to its
  // Logto origin through the history, and this moves it back, recording the
  // hop so the history stays walkable. The step keeps its name so existing
  // usermgmt.idp_migration rows and `d2e migrate-idp-roles --report` still read.
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
  log(
    `[idp-migration] rekey: aligned ${summary.rekeyed} usermgmt users with their trex user id ` +
    `(${trexIdByUsermgmt.size - rekeyAttempts} already matched), failed ${rekeyFailures}`
  )

  return summary
}
