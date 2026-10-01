// The seed admin's usermgmt memberships are written by knex seeds, which never
// reach trex, so on a trex install nothing else gives that account its trex
// roles. This grants them once trex is listening, on every boot.
import { canonicalRoleNames, groupRoleAndScopes, ROLES } from '../roles.ts'
import type { FederationAdmin } from './federation-admin.ts'

export const SEED_ADMIN_ROLES: string[] = [
  ...new Set(
    [ROLES.ALP_SYSTEM_ADMIN, ROLES.ALP_USER_ADMIN].flatMap(role => {
      const built = groupRoleAndScopes({ role })
      return built ? canonicalRoleNames(built.role, built.scopes) : []
    })
  )
]

export interface SeedAccounts {
  /** The subject of the account, or undefined when the credentials are refused. */
  signIn(email: string, password: string): Promise<string | undefined>
  /** The new account's subject, or 'exists' when the email is already taken. */
  create(email: string, password: string): Promise<string | 'exists'>
}

const parseSeedUser = (raw: string | undefined): { username: string; password: string } | undefined => {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.username === 'string' && typeof parsed?.initialPassword === 'string') {
      return { username: parsed.username, password: parsed.initialPassword }
    }
  } catch {
    // Reported by the caller as an unusable seed user.
  }
  return undefined
}

const subjectOf = (token: string): string | undefined => {
  const payload = token.split('.')[1]
  if (!payload) return undefined
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='))
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(json, c => c.charCodeAt(0))))
    return typeof decoded?.sub === 'string' ? decoded.sub : undefined
  } catch {
    return undefined
  }
}

export class HttpSeedAccounts implements SeedAccounts {
  private readonly fetchImpl: typeof fetch
  private readonly attempts: number
  private readonly delayMs: number

  constructor(private readonly opts: {
    authUrl: string
    serviceRoleKey: string
    fetchImpl?: typeof fetch
    attempts?: number
    delayMs?: number
  }) {
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.attempts = opts.attempts ?? 10
    this.delayMs = opts.delayMs ?? 3000
  }

  private async send(path: string, body: unknown, authorization?: string): Promise<Response> {
    const url = `${this.opts.authUrl.replace(/\/+$/, '')}${path}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authorization) headers.Authorization = authorization
    let lastError: unknown
    for (let i = 0; i < this.attempts; i++) {
      try {
        return await this.fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) })
      } catch (err) {
        lastError = err
        if (i < this.attempts - 1) await new Promise(r => setTimeout(r, this.delayMs))
      }
    }
    throw new Error(`trex unreachable at ${url}: ${lastError}`)
  }

  async signIn(email: string, password: string): Promise<string | undefined> {
    const res = await this.send('/token?grant_type=password', { email, password })
    if (!res.ok) {
      await res.body?.cancel()
      return undefined
    }
    const body = await res.json().catch(() => null)
    return typeof body?.access_token === 'string' ? subjectOf(body.access_token) : undefined
  }

  async create(email: string, password: string): Promise<string | 'exists'> {
    if (!this.opts.serviceRoleKey) {
      throw new Error('no trex service-role key (SUPABASE_SERVICE_ROLE_KEY / TREX__SERVICE_ROLE_KEY)')
    }
    const res = await this.send('/admin/users', { email, password }, `Bearer ${this.opts.serviceRoleKey}`)
    if (res.status === 422) {
      const body = await res.json().catch(() => null)
      if (body?.error === 'user_already_exists') return 'exists'
      throw new Error(`creating ${email} refused: ${body?.error_description ?? body?.error ?? 422}`)
    }
    if (!res.ok) {
      await res.body?.cancel()
      throw new Error(`creating ${email} failed: ${res.status}`)
    }
    const created = await res.json()
    if (typeof created?.id !== 'string') throw new Error(`creating ${email}: response missing id`)
    return created.id
  }
}

/**
 * Ensures the seed account exists in trex and holds the admin roles its seeded
 * memberships stand for. Never throws: a failure is logged and the next boot
 * retries. Returns the account's subject when the roles were attempted.
 */
export async function ensureSeedAdmin(
  cfg: { seedUser: string | undefined; userDomain: string },
  accounts: SeedAccounts,
  admin: FederationAdmin,
  log: (msg: string) => void = msg => console.log(msg)
): Promise<string | undefined> {
  const seed = parseSeedUser(cfg.seedUser)
  if (!seed) return undefined
  const email = seed.username.includes('@') ? seed.username : `${seed.username}@${cfg.userDomain}`

  let userId: string | undefined
  try {
    userId = await accounts.signIn(email, seed.password)
    if (!userId) {
      const created = await accounts.create(email, seed.password)
      if (created === 'exists') {
        log(`[seed-admin] ${email} exists but its subject could not be resolved with the seed password; roles not granted`)
        return undefined
      }
      userId = created
      log(`[seed-admin] created ${email}`)
    }
  } catch (err) {
    log(`[seed-admin] could not resolve ${email}; will retry on the next start: ${err}`)
    return undefined
  }

  let assigned = 0
  for (const role of SEED_ADMIN_ROLES) {
    try {
      await admin.assignRole(userId, role)
      assigned++
    } catch (err) {
      log(`[seed-admin] ${role} failed for ${email}: ${err}`)
    }
  }
  log(`[seed-admin] ${email}: ${assigned}/${SEED_ADMIN_ROLES.length} roles ensured`)
  return userId
}
