import { Service } from 'typedi'
import { get, del } from './request-util'
import { createLogger } from '../Logger'
import { services } from '../env'

@Service()
export class WebAPI {
  private readonly logger = createLogger(this.constructor.name)
  private readonly baseUrl: string

  constructor() {
    if (!services.webapi) {
      this.logger.warn('SERVICE_ROUTES.webapi is not set; syncUserRoles will be a no-op')
    }
    this.baseUrl = services.webapi || ''
  }

  // To upsert sec_user_role from the user's JWT scopes.
  async syncUserRoles(authorizationHeader: string): Promise<{ ok: boolean; status?: number }> {
    if (!this.baseUrl) {
      return { ok: false }
    }
    if (!authorizationHeader) {
      this.logger.warn('syncUserRoles called without an authorization header')
      return { ok: false }
    }

    const url = `${this.baseUrl}/user/me`
    try {
      const response = await get(url, { headers: { Authorization: authorizationHeader } })
      this.logger.info('WebAPI /user/me sync succeeded')
      return { ok: true, status: response.status }
    } catch (err: any) {
      const status = err?.response?.status
      const body =
        typeof err?.response?.data === 'string' ? err.response.data : JSON.stringify(err?.response?.data || '')
      this.logger.warn(`WebAPI /user/me sync failed (${status ?? 'no status'}): ${body.slice(0, 200)}`)
      return { ok: false, status }
    }
  }

  // Removes the user's membership from every role and deletes their personal role.
  async deleteUserAccess(idpUserId: string, authorizationHeader: string): Promise<void> {
    if (!this.baseUrl) {
      this.logger.warn('SERVICE_ROUTES.webapi is not set; skipping WebAPI cleanup')
      return
    }
    if (!idpUserId || !authorizationHeader) {
      this.logger.warn('deleteUserAccess requires idpUserId and an authorization header; skipping')
      return
    }

    const headers = { Authorization: authorizationHeader }

    // Resolve the numeric WebAPI user id from the login (idpUserId).
    const usersRes = await get(`${this.baseUrl}/user`, { headers })
    const webApiUser = (usersRes.data || []).find((u: any) => u.login === idpUserId)
    if (!webApiUser) {
      this.logger.info(`No WebAPI user for ${idpUserId}; nothing to clean`)
      return
    }
    const userId = webApiUser.id

    const rolesRes = await get(`${this.baseUrl}/user/${userId}/roles`, { headers })
    const roles = rolesRes.data || []

    for (const role of roles) {
      try {
        if (role.name === idpUserId) {
          // personal role (name === login): delete the role outright (cascades membership + perms)
          await del(`${this.baseUrl}/role/${role.id}`, { headers })
        } else {
          // shared role (admin/cohort reader/"Source user (x)"/etc): remove only this user's membership
          await del(`${this.baseUrl}/role/${role.id}/users/${userId}`, { headers })
        }
      } catch (err: any) {
        this.logger.warn(
          `WebAPI cleanup: role ${role.id} for ${idpUserId} failed (${err?.response?.status ?? 'no status'})`
        )
      }
    }
    this.logger.info(`WebAPI access cleanup complete for ${idpUserId}`)
  }
}
