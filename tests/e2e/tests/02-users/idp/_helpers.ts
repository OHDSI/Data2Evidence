/**
 * Shared IDP test harness — the auth-provider contract every sign-in path must satisfy.
 *
 * This is a deliberate, folder-scoped exception to the suite's inline-helper convention
 * (see 02-users/user-roles-token.spec.ts): the four provider specs
 * (logto-native / entra-external-id / entra / physionet) would otherwise duplicate all of
 * login + token-read + claim assertion. The helpers here are lifted verbatim from
 * user-roles-token.spec.ts and extended with `loginViaConnector`, `decodeToken`,
 * `assertClaimContract`, and env gating so any future `D2E_IDP=trex` cutover re-runs the
 * exact same contract.
 */
import { expect } from '../../fixtures'
import type { APIRequestContext, Page } from '@playwright/test'
import { MINUTE_1, MINUTE_5, MINUTE_10, SECOND_30 } from '../../const'

export const USERMGMT = '/d2e/usermgmt/api'

export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Updatepassword12345'

// ---- env gating ---------------------------------------------------------------

/**
 * Which of `names` are missing/blank from the environment. A gated spec calls this and
 * feeds the result to `test.skip` so a skip always names the vars that would unblock it —
 * never a silent pass. (See each connector spec's top-of-file `test.skip(...)`.)
 */
export function missingEnv(names: string[]): string[] {
  return names.filter(n => !(process.env[n] ?? '').trim())
}

export function skipReason(names: string[]): string {
  const missing = missingEnv(names)
  return missing.length ? `set ${missing.join(', ')} to run this path` : ''
}

// ---- login --------------------------------------------------------------------

/** Native username/password login on the Logto sign-in form (no upstream connector). */
export async function loginViaUI(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').waitFor({ state: 'visible', timeout: MINUTE_1 })
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill(username)
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export interface UpstreamCreds {
  username: string
  password: string
}

/**
 * Sign in through a social/enterprise connector: click the connector button the Logto
 * sign-in screen renders for a `LOGTO__SOCIAL_SIGNIN_TARGETS` entry, then drive the
 * upstream IDP's own username/password form.
 *
 * The click triggers a full-page redirect to the upstream IdP. We MUST wait for the browser
 * to actually leave the portal origin before touching any field — otherwise the selectors
 * race the still-visible Logto sign-in page and match its native fields / social buttons.
 * Once on the upstream we branch: Microsoft (Entra/CIAM) splits identifier and password
 * across two screens; a generic OIDC provider (e.g. PhysioNet's Django app) uses a single
 * form and may show a separate consent/authorize page before redirecting back.
 *
 * `connectorName` is the visible button label on the Logto screen (the connector's metadata
 * `name.en`); `target` is used for logging.
 */
export async function loginViaConnector(
  page: Page,
  opts: { target: string; connectorName: RegExp; creds: UpstreamCreds }
): Promise<void> {
  const { target, connectorName, creds } = opts

  await page.goto('/d2e/portal')
  // Origin from the page (not an env fallback) so it always matches the fixture's baseURL.
  const portalOrigin = new URL(page.url()).origin

  // The connector button may render as a button or a link depending on the sign-in theme.
  const connectorButton = page.getByRole('button', { name: connectorName }).or(
    page.getByRole('link', { name: connectorName })
  )
  await connectorButton.first().waitFor({ state: 'visible', timeout: MINUTE_1 })
  console.log(`[login] clicking connector "${target}"`)
  await connectorButton.first().click()

  // Wait until we've actually navigated to the upstream IdP (a different origin). A failure
  // here means the connector button is missing or the upstream is unreachable — surface that
  // plainly instead of letting a later selector time out on the wrong page.
  await page
    .waitForURL(url => url.origin !== portalOrigin, { timeout: MINUTE_1 })
    .catch(() => {
      throw new Error(
        `connector "${target}": browser never left ${portalOrigin} after clicking — upstream IdP unreachable or connector button missing`
      )
    })
  const upstreamHost = new URL(page.url()).host
  const isMicrosoft = /microsoftonline|ciamlogin|live\.com|microsoft/i.test(upstreamHost)
  console.log(`[login] upstream IdP host: ${upstreamHost}${isMicrosoft ? ' (microsoft)' : ''}`)

  // Interactive mode (E2E_MANUAL_LOGIN): for real accounts with MFA, the tester completes the
  // whole sign-in (email, password, number-match) in the headed browser; we just wait for the
  // redirect back to the portal. Avoids fighting the upstream's anti-automation SPA.
  if ((process.env.E2E_MANUAL_LOGIN ?? '').trim()) {
    console.log(
      `[login] MANUAL mode — complete the sign-in (including MFA) in the browser window; ` +
        `waiting up to 10 min for return to ${portalOrigin}`
    )
    // Auto-dismiss Microsoft's "Stay signed in?" (KMSI) prompt so the last click isn't on you.
    page
      .getByRole('button', { name: /^\s*(yes|no|ja|nein)\s*$/i })
      .first()
      .waitFor({ state: 'visible', timeout: MINUTE_10 })
      .then(async () => {
        await page.getByRole('button', { name: /^\s*(yes|no|ja|nein)\s*$/i }).first().click().catch(() => {})
      })
      .catch(() => {})
    await page.waitForURL(url => url.origin === portalOrigin, { timeout: MINUTE_10 })
    return
  }

  const identifier = page
    .locator(
      'input[name="loginfmt"], input[name="username"], input[name="identifier"], input[name="login"], input[type="email"], input#id_username, input#username, input#identifier'
    )
    .first()
  await identifier.waitFor({ state: 'visible', timeout: MINUTE_1 })
  await identifier.fill(creds.username)

  // Microsoft splits identifier/password across two screens with a "Next" button; a generic
  // single-form provider has no such step, so only take it on a Microsoft origin.
  if (isMicrosoft) {
    const next = page.getByRole('button', { name: /next|weiter|continue/i })
    if (await next.first().isVisible().catch(() => false)) {
      await next.first().click()
    }
  }

  // A rejected identifier (unknown user / wrong tenant) surfaces an error alert instead of
  // the password screen. Race the two so a bad account fails fast with a clear, cred-free
  // message rather than a 60s timeout on a field that will never appear.
  const identifierError = page
    .getByRole('alert')
    .filter({ hasText: /incorrect|isn.?t correct|doesn.?t exist|couldn.?t find|can.?t find|no account|not found/i })
  const password = page
    .locator('input[name="passwd"], input[name="password"], input[type="password"], input#id_password, input#password')
    .first()
  await Promise.race([
    password.waitFor({ state: 'visible', timeout: MINUTE_1 }).catch(() => {}),
    identifierError.first().waitFor({ state: 'visible', timeout: MINUTE_1 }).catch(() => {})
  ])
  if (await identifierError.first().isVisible().catch(() => false)) {
    throw new Error(
      `connector "${target}": upstream IdP rejected the identifier — account not found or not in this tenant`
    )
  }
  await password.waitFor({ state: 'visible', timeout: SECOND_30 })
  await password.fill(creds.password)

  // Name-based only: getByRole matches both <button> and <input type=submit> (by its value),
  // and NOT the navbar's "Search" submit — a bare button[type=submit] fallback would grab that.
  const submit = page.getByRole('button', { name: /sign ?in|log ?in|anmelden/i })
  await submit.first().click()

  // A wrong password surfaces an error alert instead of progressing. Race it against the
  // signs of progress (return to the portal origin, or Microsoft's "stay signed in?" prompt)
  // so a bad password fails fast & cred-free without delaying the success path.
  const passwordError = page
    .getByRole('alert')
    .filter({
      hasText:
        /incorrect|isn.?t correct|invalid|wrong|try again|couldn.?t (sign|find)|could not find|account with this email|email address or password|does.?n.?t match/i
    })
  const staySignedInBtn = page.getByRole('button', { name: /yes|ja/i })
  await Promise.race([
    passwordError.first().waitFor({ state: 'visible', timeout: SECOND_30 }).catch(() => {}),
    page.waitForURL(url => url.origin === portalOrigin, { timeout: SECOND_30 }).catch(() => {}),
    staySignedInBtn.first().waitFor({ state: 'visible', timeout: SECOND_30 }).catch(() => {})
  ])
  if (await passwordError.first().isVisible().catch(() => false)) {
    throw new Error(`connector "${target}": upstream IdP rejected the password`)
  }

  if (isMicrosoft) {
    // Microsoft's "Stay signed in?" interstitial, if present, must be dismissed to return.
    const staySignedIn = page.getByRole('button', { name: /yes|ja/i })
    if (await staySignedIn.first().isVisible({ timeout: SECOND_30 }).catch(() => false)) {
      await staySignedIn.first().click()
    }
  } else {
    // Generic OIDC (e.g. PhysioNet) may show an authorize/consent page after login that must
    // be approved before it redirects back with the code.
    const authorize = page.getByRole('button', { name: /authorize|allow|approve|accept|consent/i })
    if (await authorize.first().isVisible({ timeout: SECOND_30 }).catch(() => false)) {
      console.log('[login] approving upstream consent')
      await authorize.first().click()
    }
  }
}

/**
 * Clear the OIDC session (Logto SSO cookie + portal sessionStorage tokens) and return to
 * the sign-in form, so a spec can switch users without depending on nav selectors.
 */
export async function resetSession(page: Page): Promise<void> {
  await page.context().clearCookies()
  try {
    await page.evaluate(() => {
      sessionStorage.clear()
      localStorage.clear()
    })
  } catch {
    // context may be mid-navigation; storage still gets cleared on next load
  }
  await page.goto('/d2e/portal')
  await page.locator('input[name="identifier"]').waitFor({ state: 'visible', timeout: MINUTE_1 })
}

// ---- token read + decode ------------------------------------------------------

/**
 * The portal (@axa-fr/react-oidc) stores its tokens in sessionStorage under
 * `oidc.default:<origin>/d2e/portal/login-callback`. Wait until it lands, then read it.
 * Uses expect.poll + page.evaluate (not waitForFunction, whose in-page harness is blocked
 * by the portal's strict CSP: script-src has no 'unsafe-eval').
 */
export async function readAccessToken(page: Page): Promise<string> {
  const readToken = async (): Promise<string | null> => {
    try {
      return await page.evaluate(() => {
        const key = Object.keys(sessionStorage).find(k => k.startsWith('oidc.default:'))
        if (!key) return null
        try {
          return JSON.parse(sessionStorage.getItem(key) || '{}')?.tokens?.accessToken || null
        } catch {
          return null
        }
      })
    } catch {
      // Execution context destroyed by an in-flight OIDC redirect — retry.
      return null
    }
  }
  await expect
    .poll(readToken, { timeout: MINUTE_1, message: 'access token did not appear in sessionStorage' })
    .toBeTruthy()
  const token = await readToken()
  if (!token) throw new Error('access token did not appear in sessionStorage')
  return token
}

export type TokenClaims = Record<string, unknown> & {
  iss?: string
  sub?: string
  aud?: string | string[]
  email?: string
  preferred_username?: string
  username?: string
  name?: string
  roles?: unknown
}

/** Decode a JWT payload without verifying the signature (verification is WebAPI/trex's job). */
export function decodeToken(token: string): TokenClaims {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
}

export function rolesFromToken(token: string): string[] {
  const payload = decodeToken(token)
  return Array.isArray(payload.roles) ? (payload.roles as string[]) : []
}

export function authHeaders(token: string, baseURL: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
    origin: baseURL,
    referer: `${baseURL}/d2e/portal`
  }
}

// ---- contract assertions ------------------------------------------------------

export async function expectContainsAll(actual: string[], expected: string[], label: string): Promise<void> {
  const missing = expected.filter(e => !actual.includes(e))
  expect(missing, `${label} is missing ${JSON.stringify(missing)}; got ${JSON.stringify(actual)}`).toEqual([])
}

export interface ClaimContractExpectations {
  /** Roles that must all be present in the `roles` claim. */
  roles?: string[]
  /** Claim keys that must be present and non-empty (beyond the always-required base set). */
  requiredClaims?: string[]
}

/**
 * The auth-provider contract WebAPI / Atlas3 / usermgmt depend on. Every path must satisfy
 * the base set; `expected.requiredClaims`/`roles` add the path-specific extras
 * (`physionet_access_token`, an Entra group-derived role, …). This is the single assertion
 * a `D2E_IDP=trex` cutover must keep green — a failing key here is a concrete Trex gap.
 */
export function assertClaimContract(token: string, expected: ClaimContractExpectations = {}): TokenClaims {
  const claims = decodeToken(token)

  expect(typeof claims.iss, `iss missing; got ${JSON.stringify(claims.iss)}`).toBe('string')
  expect(typeof claims.sub, `sub missing; got ${JSON.stringify(claims.sub)}`).toBe('string')
  expect(claims.aud, `aud missing`).toBeTruthy()
  expect(typeof claims.email, `email claim missing; got ${JSON.stringify(claims.email)}`).toBe('string')

  // Display name under any of the three; Trex carries the login in `name`.
  const displayName = claims.preferred_username ?? claims.username ?? claims.name
  expect(
    typeof displayName === 'string' && displayName.length > 0,
    `no display-name claim (preferred_username/username/name) present; got ${JSON.stringify({
      preferred_username: claims.preferred_username,
      username: claims.username,
      name: claims.name
    })}`
  ).toBeTruthy()

  expect(Array.isArray(claims.roles), `roles claim is not an array; got ${JSON.stringify(claims.roles)}`).toBeTruthy()

  for (const key of expected.requiredClaims ?? []) {
    const v = claims[key]
    expect(
      v !== undefined && v !== null && v !== '',
      `required claim "${key}" missing/empty; got ${JSON.stringify(v)}`
    ).toBeTruthy()
  }

  // Path-specific roles; arrayContaining([]) is a no-op when none are requested.
  expect(
    claims.roles,
    `roles claim is missing ${JSON.stringify(expected.roles ?? [])}; got ${JSON.stringify(claims.roles)}`
  ).toEqual(expect.arrayContaining(expected.roles ?? []))

  return claims
}

// ---- provisioning (admin-driven, via usermgmt REST) ---------------------------

export interface PortalDataset {
  id: string
  tokenStudyCode?: string
  type?: string
  databaseName?: string
  studyDetail?: { name?: string }
  tenant?: { id?: string }
}

/** Resolve the demo WebAPI dataset (id + token code + tenant) for researcher-role grants. */
export async function resolveWebapiDataset(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>
): Promise<{ datasetId: string; datasetCode: string; tenantId: string }> {
  const dsRes = await api.get(`${base}/d2e/system-portal/dataset/list/systemadmin`, { headers: adminHeaders })
  expect(dsRes.ok(), `dataset list failed: ${dsRes.status()}`).toBeTruthy()
  const datasets = (await dsRes.json()) as PortalDataset[]
  const webapiDatasets = datasets.filter(d => d.type === 'webapi' && d.id && d.tokenStudyCode && d.tenant?.id)
  const dataset =
    webapiDatasets.find(d => d.studyDetail?.name === 'Demo dataset' || d.databaseName === 'demo_database') ??
    webapiDatasets[0]
  expect(
    dataset,
    `No webapi dataset found. Datasets: ${JSON.stringify(datasets.map(d => ({ n: d.studyDetail?.name, t: d.type })))}`
  ).toBeTruthy()
  return {
    datasetId: dataset.id,
    datasetCode: dataset.tokenStudyCode as string,
    tenantId: dataset.tenant!.id as string
  }
}

/** Create a user with a password and resolve its internal usermgmt id. */
export async function provisionUser(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  username: string,
  password: string
): Promise<string> {
  const addRes = await api.post(`${base}${USERMGMT}/member/tenant/add`, {
    headers: adminHeaders,
    data: { username, password }
  })
  expect(addRes.status(), `member/tenant/add failed: ${await addRes.text()}`).toBe(201)

  await expect
    .poll(
      async () => {
        const res = await api.get(`${base}${USERMGMT}/user`, { headers: adminHeaders })
        if (!res.ok()) return undefined
        const users = (await res.json()) as Array<{ id: string; username: string }>
        return users.find(u => u.username === username)?.id
      },
      { timeout: SECOND_30, message: `user ${username} did not appear in usermgmt` }
    )
    .toBeTruthy()
  const usersRes = await api.get(`${base}${USERMGMT}/user`, { headers: adminHeaders })
  const users = (await usersRes.json()) as Array<{ id: string; username: string }>
  return users.find(u => u.username === username)!.id
}

/** Look up a usermgmt user id by username (for federated users provisioned at login). */
export async function findUserIdByUsername(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  match: (u: { username: string; email?: string }) => boolean
): Promise<string | undefined> {
  const res = await api.get(`${base}${USERMGMT}/user`, { headers: adminHeaders })
  if (!res.ok()) return undefined
  const users = (await res.json()) as Array<{ id: string; username: string; email?: string }>
  return users.find(match)?.id
}

export interface UsermgmtUser {
  id: string
  username: string
  email?: string
  idpUserId?: string
  active?: boolean
}

/** Look up the full usermgmt user record (id + idpUserId + active) for linkage assertions. */
export async function findUser(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  match: (u: UsermgmtUser) => boolean
): Promise<UsermgmtUser | undefined> {
  const res = await api.get(`${base}${USERMGMT}/user`, { headers: adminHeaders })
  if (!res.ok()) return undefined
  const users = (await res.json()) as UsermgmtUser[]
  return users.find(match)
}

/**
 * Assert the usermgmt row is bound to the token subject by idp_user_id (not merely a shared
 * email/username) and is active; returns the row. Set `poll` to wait out first-login provisioning.
 * A single lookup per attempt — the found row is captured, not re-fetched.
 */
export async function assertLinkedBySub(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  sub: string,
  opts: { poll?: boolean; label?: string } = {}
): Promise<UsermgmtUser> {
  const label = opts.label ?? sub
  let linked: UsermgmtUser | undefined
  const lookup = async () => {
    linked = await findUser(api, base, adminHeaders, u => u.idpUserId === sub)
    return linked?.id
  }
  if (opts.poll) {
    await expect
      .poll(lookup, { timeout: SECOND_30, message: `no usermgmt user linked to idp sub for ${label}` })
      .toBeTruthy()
  } else {
    await lookup()
    expect(linked, `no usermgmt user linked to idp sub ${label}`).toBeTruthy()
  }
  expect(linked!.active, `usermgmt user ${linked!.id} is not active`).not.toBe(false)
  return linked!
}

/** Grant ALP_SYSTEM_ADMIN (-> role.systemadmin -> `admin`). */
export async function grantSystemAdmin(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  userId: string
): Promise<void> {
  const res = await api.post(`${base}${USERMGMT}/alp-data-admin/register`, {
    headers: adminHeaders,
    data: { userId, roles: ['ALP_SYSTEM_ADMIN'] }
  })
  expect(res.status(), `alp-data-admin/register failed: ${await res.text()}`).toBe(200)
}

/** Grant RESEARCHER on a dataset (-> Source user / cohort scopes). */
export async function grantResearcher(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  args: { userId: string; tenantId: string; studyId: string }
): Promise<void> {
  const res = await api.post(`${base}${USERMGMT}/user-group/register-study-roles`, {
    headers: adminHeaders,
    data: { userIds: [args.userId], tenantId: args.tenantId, studyId: args.studyId, roles: ['RESEARCHER'] }
  })
  expect(res.status(), `register-study-roles failed: ${await res.text()}`).toBe(200)
}

/** Best-effort delete of a provisioned user (called from a spec's finally block). */
export async function deleteUser(
  api: APIRequestContext,
  base: string,
  adminHeaders: Record<string, string>,
  userId: string
): Promise<void> {
  const res = await api.delete(`${base}${USERMGMT}/member/tenant/delete`, {
    headers: adminHeaders,
    data: { userId }
  })
  console.log(`[cleanup] delete user ${userId} -> ${res.status()}`)
}

/** Forward the user's token to WebAPI so it upserts sec_user_role from the JWT scopes. */
export async function syncWebapiRoles(
  api: APIRequestContext,
  base: string,
  userToken: string
): Promise<void> {
  // Best-effort: roles also resolve from the token's sec_external_role_map, and WebAPI's
  // openidDirect decoder can transiently reject tokens after a Logto key rotation (see WebAPI
  // OidcAuthConfig). Retry, then warn rather than fail on a persistent non-2xx.
  let res = await api.post(`${base}${USERMGMT}/me/sync-webapi-roles`, { headers: authHeaders(userToken, base) })
  for (let attempt = 1; attempt <= 5 && !res.ok(); attempt++) {
    await new Promise(r => setTimeout(r, 1000))
    res = await api.post(`${base}${USERMGMT}/me/sync-webapi-roles`, { headers: authHeaders(userToken, base) })
  }
  if (!res.ok()) {
    console.warn(`[warn] sync-webapi-roles still ${res.status()} after retries: ${await res.text()}`)
  }
}

/** Read the caller's WebAPI numeric user id from /user/me. */
export async function webapiUserId(
  api: APIRequestContext,
  base: string,
  userToken: string
): Promise<number> {
  const meRes = await api.get(`${base}/WebAPI/user/me/`, { headers: authHeaders(userToken, base) })
  expect(meRes.ok(), `WebAPI /user/me failed: ${meRes.status()}`).toBeTruthy()
  const me = (await meRes.json()) as { user?: { id: number; login: string } }
  const id = me.user?.id
  expect(typeof id, `unexpected /user/me shape: ${JSON.stringify(me)}`).toBe('number')
  return id as number
}

/** Read a user's WebAPI role names (admin-token gated). */
export async function webapiRoleNames(
  api: APIRequestContext,
  base: string,
  adminToken: string,
  userId: number
): Promise<string[]> {
  const rolesRes = await api.get(`${base}/WebAPI/user/${userId}/roles`, {
    headers: authHeaders(adminToken, base)
  })
  expect(
    rolesRes.ok(),
    `WebAPI /user/${userId}/roles failed: ${rolesRes.status()} ${await rolesRes.text()}`
  ).toBeTruthy()
  return ((await rolesRes.json()) as Array<{ name: string }>).map(r => r.name)
}
