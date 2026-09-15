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
 * Which usermgmt users to link to which Logto identities.
 *
 * Matching is by identifier only: a row's idp_user_id is a Logto user id, or
 * its subject history says it was one. Names and emails never decide a match;
 * they only name the trex account the identity is linked to.
 */
export function planLinks(
  usermgmt: UsermgmtUserRow[],
  logto: LogtoUserRow[],
  history: SubjectHistoryRow[],
  domain: string
): LinkPlan {
  const logtoById = new Map(logto.map(l => [l.id, l]))
  const originBySub = new Map<string, string>()
  for (const h of history) {
    if (h.oldSub && logtoById.has(h.oldSub)) originBySub.set(`${h.userId}|${h.newSub}`, h.oldSub)
  }

  const candidates: PlannedLink[] = []
  const skipped: SkippedUser[] = []
  let notLogto = 0

  for (const row of usermgmt) {
    if (!row.idpUserId) {
      notLogto++
      continue
    }
    const logtoId = logtoById.has(row.idpUserId)
      ? row.idpUserId
      : originBySub.get(`${row.id}|${row.idpUserId}`)
    if (!logtoId) {
      notLogto++
      continue
    }
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
