export interface PhysionetClientConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string
}

export interface PhysionetTokens {
  accessToken: string
  refreshToken: string | null
  expiresIn: number
  scope: string | null
}

export interface PhysionetUserinfo {
  sub: string
  username?: string
  [k: string]: unknown
}

export type DatasetAccessResult =
  | { kind: 'ok'; hasAccess: boolean }
  | { kind: 'invalid_token' }
  | { kind: 'upstream_error'; status?: number }

export class PhysionetHttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly transient: boolean) {
    super(message)
    this.name = 'PhysionetHttpError'
  }
}

const DEFAULT_TIMEOUT_MS = 10_000

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fn(ctrl.signal)
  } finally {
    clearTimeout(t)
  }
}

export class PhysionetAPI {
  constructor(
    private readonly cfg: PhysionetClientConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  buildAuthorizeUrl(params: { state: string; codeChallenge: string }): string {
    const u = new URL('/oauth/authorize/', this.cfg.baseUrl)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', this.cfg.clientId)
    u.searchParams.set('redirect_uri', this.cfg.redirectUri)
    u.searchParams.set('scope', this.cfg.scopes)
    u.searchParams.set('state', params.state)
    u.searchParams.set('code_challenge', params.codeChallenge)
    u.searchParams.set('code_challenge_method', 'S256')
    return u.toString()
  }

  async exchangeCode(p: { code: string; codeVerifier: string }): Promise<PhysionetTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      redirect_uri: this.cfg.redirectUri,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      code_verifier: p.codeVerifier,
    })
    const res = await withTimeout(signal => this.fetchFn(new URL('/oauth/token/', this.cfg.baseUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal,
    }))
    if (!res.ok) throw new PhysionetHttpError(`physionet token exchange failed: ${res.status}`, res.status, res.status >= 500)
    const j = await res.json()
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token ?? null,
      expiresIn: j.expires_in,
      scope: j.scope ?? null,
    }
  }

  async refresh(refreshToken: string): Promise<PhysionetTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
    })
    const res = await withTimeout(signal => this.fetchFn(new URL('/oauth/token/', this.cfg.baseUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal,
    }))
    if (!res.ok) {
      // 400/401 on refresh = invalid_grant (link revoked upstream). 5xx = transient.
      throw new PhysionetHttpError(`physionet refresh failed: ${res.status}`, res.status, res.status >= 500)
    }
    const j = await res.json()
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token ?? refreshToken,
      expiresIn: j.expires_in,
      scope: j.scope ?? null,
    }
  }

  async revoke(token: string): Promise<void> {
    const body = new URLSearchParams({
      token,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
    })
    try {
      await withTimeout(signal => this.fetchFn(new URL('/oauth/revoke-token/', this.cfg.baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal,
      }))
    } catch {
      // best-effort; ignore failures so unlink still proceeds
    }
  }

  async userinfo(accessToken: string): Promise<PhysionetUserinfo> {
    const res = await withTimeout(signal => this.fetchFn(new URL('/oauth/userinfo/', this.cfg.baseUrl).toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    }))
    if (!res.ok) throw new PhysionetHttpError(`physionet userinfo failed: ${res.status}`, res.status, res.status >= 500)
    return await res.json()
  }

  async checkDatasetAccess(p: { accessToken: string; slug: string; version: string }): Promise<DatasetAccessResult> {
    try {
      const u = new URL('/oauth/dataset-access/', this.cfg.baseUrl)
      u.searchParams.set('slug', p.slug)
      u.searchParams.set('version', p.version)
      const res = await withTimeout(signal => this.fetchFn(u.toString(), {
        headers: { Authorization: `Bearer ${p.accessToken}` },
        signal,
      }))
      if (res.status === 401 || res.status === 403) return { kind: 'invalid_token' }
      if (res.status >= 500) return { kind: 'upstream_error', status: res.status }
      if (res.status === 200 || res.status === 404) {
        const j = await res.json()
        return { kind: 'ok', hasAccess: !!j.has_access }
      }
      return { kind: 'upstream_error', status: res.status }
    } catch {
      return { kind: 'upstream_error' }
    }
  }
}
