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
// source. Neither being set must not resolve to an empty string: that would
// send `Authorization: Bearer ` and fail as a confusing 401 instead of this
// explicit error.
export function resolveServiceRoleKey(explicit: string | undefined, injected: string | undefined): string {
  if (explicit) return explicit
  if (injected) return injected
  throw new Error(MISSING_KEY_MESSAGE)
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
