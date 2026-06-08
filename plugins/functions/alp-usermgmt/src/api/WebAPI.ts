import { Service } from 'typedi'
import { get } from './request-util'
import { createLogger } from '../Logger'
import { env } from '../env'

interface ServiceRoutes {
  webapi?: string
}

@Service()
export class WebAPI {
  private readonly logger = createLogger(this.constructor.name)
  private readonly baseUrl: string

  constructor() {
    const routes: ServiceRoutes = JSON.parse(env.SERVICE_ROUTES || '{}')
    if (!routes.webapi) {
      this.logger.warn('SERVICE_ROUTES.webapi is not set; syncUserRoles will be a no-op')
    }
    this.baseUrl = routes.webapi || ''
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
}
