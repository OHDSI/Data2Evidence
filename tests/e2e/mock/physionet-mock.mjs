/**
 * Mock PhysioNet OIDC + dataset-access upstream for the e2e IDP harness.
 *
 * Impersonates the PhysioNet ("DataShare") identity provider at the address the Logto
 * `physionet-oidc` connector is configured to call (default :8000), so the e2e test can
 * exercise the full federated-login + entitlements-sync flow WITHOUT the real
 * `physionet-build` Django app. Enabled by default; `PHYSIONET_UPSTREAM=real` skips it.
 *
 * Endpoints (mirroring the real connector config in .env.local):
 *   GET  /oauth/authorize/          - minimal login form -> redirect with ?code&state
 *   POST /oauth/token/              - authorization_code / refresh_token -> RS256 id_token + tokens
 *   GET  /oauth/jwks/               - JWKS (public key) the connector verifies id_tokens against
 *   GET  /oauth/oidc/userinfo       - OIDC userinfo (Bearer)
 *   GET  /oauth/dataset-access/     - entitlements check -> { has_access: true } for demowave
 *
 * Pure Node built-ins (http + crypto) — no external dependencies.
 */
import http from 'node:http'
import crypto from 'node:crypto'

const ISSUER = 'http://localhost:8000' // must match the connector's idTokenVerificationConfig.issuer
const KID = 'mock-physionet-key-1'
// Slugs the mock grants access to (drives entitlements sync -> role.researcher.<code>).
const GRANTED_SLUGS = new Set(['demowave'])

function b64url(input) {
  return Buffer.from(input).toString('base64url')
}

function makeSigner() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  jwk.kid = KID
  jwk.use = 'sig'
  jwk.alg = 'RS256'
  const sign = payload => {
    const header = { alg: 'RS256', typ: 'JWT', kid: KID }
    const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
    const sig = crypto.sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')
    return `${data}.${sig}`
  }
  return { jwk, sign }
}

function identityFromUsername(username) {
  const name = username || 'ci_e2e_test_user'
  const email = name.includes('@') ? name : `${name}@mock.physionet.local`
  // Stable subject per username so repeat logins resolve to the same account.
  const sub = `mock|${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`
  return { sub, email, name }
}

function readBody(req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => resolve(data))
  })
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function loginPage(query) {
  // Field names/button label match loginViaConnector's generic-OIDC selectors.
  // Escape the reflected query before embedding it in the form action (CodeQL: reflected XSS).
  const q = escapeHtml(query.toString())
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mock PhysioNet</title></head>
<body style="font-family:sans-serif;max-width:420px;margin:64px auto">
  <h1>Mock PhysioNet (DataShare)</h1>
  <p>Test-only upstream — any credentials are accepted.</p>
  <form method="POST" action="/oauth/authorize/?${q}">
    <p><label>Email or Username<br><input name="username" type="text" autofocus></label></p>
    <p><label>Password<br><input name="password" type="password"></label></p>
    <button type="submit">Log In</button>
  </form>
</body></html>`
}

/**
 * Start the mock. Returns a handle with `.stop()` and `.port`.
 * Binds 0.0.0.0 so it is reachable from the browser (localhost:PORT) and from the
 * Logto/usermgmt containers (host.docker.internal:PORT).
 */
export function startMock({ port = 8000 } = {}) {
  const { jwk, sign } = makeSigner()
  const codes = new Map() // code -> { nonce, clientId, user }
  const tokens = new Map() // access_token -> user

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const json = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }

    try {
      if (path === '/oauth/authorize') {
        if (req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'text/html' })
          res.end(loginPage(url.searchParams))
          return
        }
        if (req.method === 'POST') {
          const body = new URLSearchParams(await readBody(req))
          const user = identityFromUsername(body.get('username') || 'ci_e2e_test_user')
          const code = crypto.randomBytes(24).toString('hex')
          codes.set(code, {
            nonce: url.searchParams.get('nonce') || undefined,
            clientId: url.searchParams.get('client_id') || undefined,
            user
          })
          const redirectUri = url.searchParams.get('redirect_uri')
          const state = url.searchParams.get('state')
          const loc = new URL(redirectUri)
          loc.searchParams.set('code', code)
          if (state) loc.searchParams.set('state', state)
          res.writeHead(302, { location: loc.toString() })
          res.end()
          return
        }
      }

      if (path === '/oauth/token' && req.method === 'POST') {
        const body = new URLSearchParams(await readBody(req))
        const grant = body.get('grant_type')
        const now = Math.floor(Date.now() / 1000)
        const accessToken = crypto.randomBytes(24).toString('hex')
        const refreshToken = crypto.randomBytes(24).toString('hex')

        if (grant === 'refresh_token') {
          // Entitlements sync may redeem a refresh token when no access token claim exists.
          tokens.set(accessToken, identityFromUsername('ci_e2e_test_user'))
          return json(200, {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 36000,
            scope: 'openid profile email credentialing:read'
          })
        }

        // authorization_code
        const record = codes.get(body.get('code'))
        if (!record) return json(400, { error: 'invalid_grant' })
        codes.delete(body.get('code'))
        const clientId = body.get('client_id') || record.clientId || 'mock-client'
        const { sub, email, name } = record.user
        tokens.set(accessToken, record.user)
        const idToken = sign({
          iss: ISSUER,
          aud: clientId, // connector verifies audience === parsedConfig.clientId
          sub,
          email,
          email_verified: true,
          name,
          preferred_username: name,
          is_credentialed: true,
          ...(record.nonce ? { nonce: record.nonce } : {}),
          iat: now,
          exp: now + 3600
        })
        console.log(`[mock] issued tokens for aud=${clientId} email=${email} (access_token len ${accessToken.length})`)
        return json(200, {
          id_token: idToken,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 36000,
          scope: 'openid profile email credentialing:read'
        })
      }

      if (path === '/oauth/jwks') {
        return json(200, { keys: [jwk] })
      }

      if (path === '/oauth/oidc/userinfo') {
        const token = (req.headers.authorization || '').replace(/^bearer /i, '')
        const user = tokens.get(token)
        if (!user) return json(401, { error: 'invalid_token' })
        return json(200, {
          sub: user.sub,
          email: user.email,
          email_verified: true,
          name: user.name,
          preferred_username: user.name
        })
      }

      if (path === '/oauth/dataset-access') {
        const token = (req.headers.authorization || '').replace(/^bearer /i, '')
        if (!tokens.has(token)) return json(401, { error: 'invalid_token' })
        const slug = url.searchParams.get('slug') || ''
        const hasAccess = GRANTED_SLUGS.has(slug)
        console.log(`[mock] dataset-access slug=${slug} version=${url.searchParams.get('version')} -> has_access=${hasAccess}`)
        return json(200, { has_access: hasAccess })
      }

      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not_found', path }))
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }))
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      resolve({
        port,
        stop: () => new Promise(r => server.close(() => r()))
      })
    })
  })
}
