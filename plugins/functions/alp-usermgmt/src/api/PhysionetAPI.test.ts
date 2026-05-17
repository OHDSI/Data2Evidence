import { assertEquals } from 'jsr:@std/assert'
import { PhysionetAPI, PhysionetClientConfig } from './PhysionetAPI.ts'

const config: PhysionetClientConfig = {
  baseUrl: 'https://physionet.example',
  clientId: 'cid',
  clientSecret: 'sec',
  redirectUri: 'https://d2e.example/cb',
  scopes: 'credentialing:read profile:read',
}

Deno.test('buildAuthorizeUrl returns a URL with expected params', () => {
  const api = new PhysionetAPI(config)
  const url = new URL(api.buildAuthorizeUrl({ state: 'st', codeChallenge: 'cc' }))
  assertEquals(url.origin + url.pathname, 'https://physionet.example/oauth/authorize/')
  assertEquals(url.searchParams.get('response_type'), 'code')
  assertEquals(url.searchParams.get('client_id'), 'cid')
  assertEquals(url.searchParams.get('redirect_uri'), 'https://d2e.example/cb')
  assertEquals(url.searchParams.get('scope'), 'credentialing:read profile:read')
  assertEquals(url.searchParams.get('state'), 'st')
  assertEquals(url.searchParams.get('code_challenge'), 'cc')
  assertEquals(url.searchParams.get('code_challenge_method'), 'S256')
})

Deno.test('exchangeCode POSTs to /oauth/token/ with form body and parses tokens', async () => {
  const fetchStub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    assertEquals(url, 'https://physionet.example/oauth/token/')
    const body = new URLSearchParams(String(init!.body))
    assertEquals(body.get('grant_type'), 'authorization_code')
    assertEquals(body.get('code'), 'authcode')
    assertEquals(body.get('code_verifier'), 'verifier')
    assertEquals(body.get('redirect_uri'), 'https://d2e.example/cb')
    return new Response(
      JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 'credentialing:read' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const api = new PhysionetAPI(config, fetchStub)
  const tok = await api.exchangeCode({ code: 'authcode', codeVerifier: 'verifier' })
  assertEquals(tok.accessToken, 'at')
  assertEquals(tok.refreshToken, 'rt')
  assertEquals(tok.expiresIn, 3600)
})

Deno.test('checkDatasetAccess on 200 with has_access=true → kind=ok, hasAccess=true', async () => {
  const fetchStub: typeof fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : (input as URL).toString())
    assertEquals(url.pathname, '/oauth/dataset-access/')
    assertEquals(url.searchParams.get('slug'), 'mimiciv')
    assertEquals(url.searchParams.get('version'), '3.1')
    return new Response(JSON.stringify({ has_access: true, slug: 'mimiciv', version: '3.1' }), { status: 200 })
  }
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 'mimiciv', version: '3.1' })
  assertEquals(r.kind, 'ok')
  if (r.kind === 'ok') assertEquals(r.hasAccess, true)
})

Deno.test('checkDatasetAccess on 401 → kind=invalid_token', async () => {
  const fetchStub: typeof fetch = async () => new Response('{}', { status: 401 })
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 's', version: 'v' })
  assertEquals(r.kind, 'invalid_token')
})

Deno.test('checkDatasetAccess on 404 → kind=ok, hasAccess=false', async () => {
  const fetchStub: typeof fetch = async () =>
    new Response(JSON.stringify({ has_access: false, slug: 's', version: 'v' }), { status: 404 })
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 's', version: 'v' })
  assertEquals(r.kind, 'ok')
  if (r.kind === 'ok') assertEquals(r.hasAccess, false)
})

Deno.test('checkDatasetAccess on 5xx → kind=upstream_error', async () => {
  const fetchStub: typeof fetch = async () => new Response('boom', { status: 502 })
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 's', version: 'v' })
  assertEquals(r.kind, 'upstream_error')
})

Deno.test('checkDatasetAccess on fetch throwing → kind=upstream_error', async () => {
  const fetchStub: typeof fetch = async () => { throw new Error('econnrefused') }
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 's', version: 'v' })
  assertEquals(r.kind, 'upstream_error')
})

Deno.test('checkDatasetAccess on 403 → kind=invalid_token', async () => {
  const fetchStub: typeof fetch = async () => new Response('{}', { status: 403 })
  const api = new PhysionetAPI(config, fetchStub)
  const r = await api.checkDatasetAccess({ accessToken: 'at', slug: 's', version: 'v' })
  assertEquals(r.kind, 'invalid_token')
})

Deno.test('refresh POSTs grant_type=refresh_token and returns new tokens', async () => {
  let captured: URLSearchParams | null = null
  const fetchStub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    assertEquals(url, 'https://physionet.example/oauth/token/')
    captured = new URLSearchParams(String(init!.body))
    return new Response(
      JSON.stringify({ access_token: 'at2', refresh_token: 'rt2', expires_in: 1800, scope: 'credentialing:read' }),
      { status: 200 },
    )
  }
  const api = new PhysionetAPI(config, fetchStub)
  const tok = await api.refresh('rt-old')
  assertEquals(captured!.get('grant_type'), 'refresh_token')
  assertEquals(captured!.get('refresh_token'), 'rt-old')
  assertEquals(tok.accessToken, 'at2')
  assertEquals(tok.refreshToken, 'rt2')
  assertEquals(tok.expiresIn, 1800)
})

Deno.test('refresh preserves caller-supplied refresh_token when server omits it', async () => {
  const fetchStub: typeof fetch = async () =>
    new Response(JSON.stringify({ access_token: 'at2', expires_in: 1800 }), { status: 200 })
  const api = new PhysionetAPI(config, fetchStub)
  const tok = await api.refresh('rt-old')
  assertEquals(tok.refreshToken, 'rt-old')
})

Deno.test('revoke swallows network errors', async () => {
  const fetchStub: typeof fetch = async () => { throw new Error('econnrefused') }
  const api = new PhysionetAPI(config, fetchStub)
  // should resolve, not reject
  await api.revoke('any-token')
})

Deno.test('revoke swallows non-OK responses', async () => {
  const fetchStub: typeof fetch = async () => new Response('boom', { status: 500 })
  const api = new PhysionetAPI(config, fetchStub)
  await api.revoke('any-token')
})

Deno.test('userinfo GETs /oauth/userinfo/ with bearer and returns json', async () => {
  let bearer = ''
  const fetchStub: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : (input as URL).toString())
    assertEquals(url.pathname, '/oauth/userinfo/')
    bearer = (init?.headers as Record<string, string>)['Authorization']
    return new Response(JSON.stringify({ sub: 'phn-1', username: 'alice' }), { status: 200 })
  }
  const api = new PhysionetAPI(config, fetchStub)
  const ui = await api.userinfo('AT')
  assertEquals(bearer, 'Bearer AT')
  assertEquals(ui.sub, 'phn-1')
  assertEquals(ui.username, 'alice')
})
