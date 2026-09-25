import type { LinkPlan, LogtoUserRow, PlannedLink, SkippedUser, SubjectHistoryRow, UsermgmtUserRow } from './types.ts'

/** The trex account email for a Logto user: their Logto email, else the username qualified with the domain. */
export function accountEmail(logto: LogtoUserRow, username: string, domain: string): string | null {
  const primary = logto.primaryEmail?.trim()
  if (primary) return primary.toLowerCase()
  const name = (username || logto.username || '').trim()
  if (!name) return null
  return (name.includes('@') ? name : `${name}@${domain}`).toLowerCase()
}

/**
 * Walks a user's subject-history chain from their current subject back to a
 * Logto identity, one hop per prior re-key. `oldSubByNewSub` maps a user's
 * `newSub` to the `oldSub` it replaced, so a subject re-keyed more than once
 * (Logto -> trex -> trex again) is still traced to its Logto origin.
 *
 * A visited set guards against a cyclic or self-referential history: the walk
 * stops instead of looping when it would revisit an id.
 */
function traceLogtoOrigin(
  userId: string,
  currentSub: string,
  logtoById: Map<string, LogtoUserRow>,
  oldSubByNewSub: Map<string, string>
): { originId: string; found: boolean; walked: boolean } {
  if (logtoById.has(currentSub)) return { originId: currentSub, found: true, walked: false }

  const visited = new Set([currentSub])
  let current = currentSub
  let walked = false
  while (true) {
    const oldSub = oldSubByNewSub.get(`${userId}|${current}`)
    if (oldSub === undefined || visited.has(oldSub)) break
    visited.add(oldSub)
    current = oldSub
    walked = true
    if (logtoById.has(current)) return { originId: current, found: true, walked: true }
  }
  return { originId: current, found: false, walked }
}

/**
 * Which usermgmt users to link to which Logto identities.
 *
 * Matching is by identifier only: a row's idp_user_id is a Logto user id, or
 * its subject history traces back to one, however many re-keys deep. Names
 * and emails never decide a match; they only name the trex account the
 * identity is linked to.
 */
export function planLinks(
  usermgmt: UsermgmtUserRow[],
  logto: LogtoUserRow[],
  history: SubjectHistoryRow[],
  domain: string
): LinkPlan {
  const logtoById = new Map(logto.map(l => [l.id, l]))
  const oldSubByNewSub = new Map<string, string>()
  for (const h of history) {
    if (h.oldSub) oldSubByNewSub.set(`${h.userId}|${h.newSub}`, h.oldSub)
  }

  const candidates: PlannedLink[] = []
  const skipped: SkippedUser[] = []
  let notLogto = 0

  for (const row of usermgmt) {
    if (!row.idpUserId) {
      notLogto++
      continue
    }
    const { originId, found, walked } = traceLogtoOrigin(row.id, row.idpUserId, logtoById, oldSubByNewSub)
    if (!found) {
      if (walked) {
        skipped.push({ usermgmtId: row.id, username: row.username, logtoId: originId, reason: 'logto_origin_missing' })
      } else {
        notLogto++
      }
      continue
    }
    const logtoId = originId
    const l = logtoById.get(logtoId)!
    const email = accountEmail(l, row.username, domain)
    if (!email) {
      skipped.push({ usermgmtId: row.id, username: row.username, logtoId, reason: 'no_email' })
      continue
    }
    candidates.push({
      usermgmtId: row.id,
      username: row.username,
      logtoId,
      currentIdpUserId: row.idpUserId,
      email,
      name: l.name,
      banned: l.isSuspended
    })
  }

  const byEmail = new Map<string, number>()
  for (const c of candidates) byEmail.set(c.email, (byEmail.get(c.email) ?? 0) + 1)
  const links: PlannedLink[] = []
  for (const c of candidates) {
    if ((byEmail.get(c.email) ?? 0) > 1) {
      skipped.push({ usermgmtId: c.usermgmtId, username: c.username, logtoId: c.logtoId, reason: 'duplicate_email' })
    } else {
      links.push(c)
    }
  }
  return { links, skipped, notLogto }
}
