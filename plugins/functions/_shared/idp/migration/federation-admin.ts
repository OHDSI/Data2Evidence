// trex's service-role admin API, as the IdP migration uses it. Network errors
// are retried (trex may still be settling right after it starts listening);
// HTTP errors are answers and are not.

export interface ProviderBody {
  displayName: string
  clientId: string
  clientSecret: string
  issuer: string
  authorizationEndpoint: string
  scopes: string
  groupsSource: 'none'
  autoProvision: false
  enabled: true
}

export type LinkOutcome =
  | { userId: string; outcome: 'linked' | 'created' | 'already_linked' }
  | { conflict: true; userId: string }

export interface FederationAdmin {
  upsertProvider(id: string, body: ProviderBody): Promise<void>
  setProviderEnabled(id: string, enabled: boolean): Promise<'ok' | 'unknown_provider'>
  link(req: { providerId: string; accountId: string; email: string; name: string | null; banned: boolean }): Promise<LinkOutcome>
  assignRole(userId: string, role: string): Promise<void>
}

export class HttpFederationAdmin implements FederationAdmin {
  private readonly fetchImpl: typeof fetch
  private readonly attempts: number
  private readonly delayMs: number

  constructor(private readonly opts: {
    federationUrl: string
    rolesUrl: string
    serviceRoleKey: string
    fetchImpl?: typeof fetch
    attempts?: number
    delayMs?: number
  }) {
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.attempts = opts.attempts ?? 10
    this.delayMs = opts.delayMs ?? 3000
  }

  private async send(method: string, url: string, body: unknown): Promise<Response> {
    if (!this.opts.serviceRoleKey) {
      throw new Error('no trex service-role key (SUPABASE_SERVICE_ROLE_KEY / TREX__SERVICE_ROLE_KEY)')
    }
    let lastError: unknown
    for (let i = 0; i < this.attempts; i++) {
      try {
        return await this.fetchImpl(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.opts.serviceRoleKey}` },
          body: JSON.stringify(body)
        })
      } catch (err) {
        lastError = err
        if (i < this.attempts - 1) await new Promise(r => setTimeout(r, this.delayMs))
      }
    }
    throw new Error(`trex unreachable at ${url}: ${lastError}`)
  }

  private async expectOk(res: Response, what: string): Promise<void> {
    if (!res.ok) throw new Error(`${what} failed: ${res.status} ${await res.text()}`)
    await res.body?.cancel()
  }

  async upsertProvider(id: string, body: ProviderBody): Promise<void> {
    await this.expectOk(await this.send('PUT', `${this.opts.federationUrl}/providers/${id}`, body), `provider ${id} upsert`)
  }

  async setProviderEnabled(id: string, enabled: boolean): Promise<'ok' | 'unknown_provider'> {
    const res = await this.send('PATCH', `${this.opts.federationUrl}/providers/${id}`, { enabled })
    if (res.status === 404) {
      await res.body?.cancel()
      return 'unknown_provider'
    }
    await this.expectOk(res, `provider ${id} enable=${enabled}`)
    return 'ok'
  }

  async link(req: { providerId: string; accountId: string; email: string; name: string | null; banned: boolean }): Promise<LinkOutcome> {
    const res = await this.send('PUT', `${this.opts.federationUrl}/links`, req)
    if (res.status === 409) {
      const body = await res.json()
      return { conflict: true, userId: String(body.userId) }
    }
    if (!res.ok) throw new Error(`link ${req.accountId} failed: ${res.status} ${await res.text()}`)
    return await res.json()
  }

  async assignRole(userId: string, role: string): Promise<void> {
    await this.expectOk(await this.send('POST', `${this.opts.rolesUrl}/assign`, { userId, role }), `assign ${role}`)
  }
}
