import { Service } from 'typedi'
import { env } from '../env'

// Role writes against the trex identity provider. The Logto equivalent also
// managed scopes; trex stores role names only, and the name is what the token
// carries and what downstream mapping reads, so there is nothing else to send.

const MISSING_KEY_MESSAGE =
  'TrexIdpAPI: no service role key available; set TREX__SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY'

// TREX__SERVICE_ROLE_KEY is an explicit override. trex injects the same
// credential it uses internally as SUPABASE_SERVICE_ROLE_KEY into every
// function worker's environment, usermgmt included, so that is the default
// source. Resolving to '' rather than throwing is deliberate: this class is a
// constructor dependency of UserGroupService, and a deployment with
// IDP__ROLE_STORE=logto has neither variable set and never reaches trex.
// Throwing here would take usermgmt down at DI time over a credential it never
// uses. post() raises instead, at the point the key is actually needed, so an
// empty bearer still never goes on the wire.
export function resolveServiceRoleKey(explicit: string | undefined, injected: string | undefined): string {
  return explicit || injected || ''
}

@Service()
export class TrexIdpAPI {
  constructor(
    private readonly baseUrl: string = env.TREX_ADMIN_URL ?? '',
    private readonly serviceRoleKey: string = resolveServiceRoleKey(
      env.TREX_SERVICE_ROLE_KEY,
      env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(path: string, body: Record<string, string>): Promise<void> {
    if (!this.serviceRoleKey) {
      throw new Error(MISSING_KEY_MESSAGE)
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`trex role ${path} failed: ${res.status}`);
    }
  }

  /**
   * Create an account and return the subject the provider gave it.
   *
   * The provider identifies accounts by email, so a bare username is qualified
   * with the configured domain - the same one the sign-in page appends, or the
   * account created here could never be signed in to.
   */
  async createUser(username: string, password: string): Promise<{ id: string; email: string }> {
    if (!this.serviceRoleKey) {
      throw new Error(MISSING_KEY_MESSAGE)
    }
    if (!env.TREX_AUTH_URL) {
      throw new Error('TrexIdpAPI: TREX__AUTH_URL is not set, so accounts cannot be created')
    }
    const email = username.includes('@') ? username : `${username}@${env.IDP_USER_DOMAIN}`
    const res = await this.fetchImpl(`${env.TREX_AUTH_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      throw new Error(`trex user creation failed for ${email}: ${res.status} ${await res.text()}`)
    }
    const created = await res.json()
    if (typeof created?.id !== 'string') {
      throw new Error(`trex accepted ${email} but returned no id`)
    }
    return { id: created.id, email }
  }

  // Sequential, not parallel: a partial failure should stop rather than leave an
  // unknown subset applied, and these lists are a handful of names.
  async assignRolesToUser(idpUserId: string, roleNames: string[]): Promise<void> {
    for (const role of roleNames) {
      await this.post("/assign", { userId: idpUserId, role });
    }
  }

  async removeRolesFromUser(idpUserId: string, roleNames: string[]): Promise<void> {
    for (const role of roleNames) {
      await this.post("/remove", { userId: idpUserId, role });
    }
  }
}
