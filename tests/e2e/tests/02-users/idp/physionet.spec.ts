/**
 * IDP path: PhysioNet OIDC — connector `physionet-oidc` (target `physionet`).
 *
 * The most complex path, and the one with two distinguishing behaviours:
 *   1. Upstream-token passthrough: the connector keeps PhysioNet's access/refresh tokens and
 *      the JWT customizer emits them as `physionet_access_token` / `physionet_refresh_token`
 *      claims (the `thirdPartyToken` mechanism) so d2e can call PhysioNet on the user's behalf.
 *   2. Entitlements sync: on login, usermgmt's EntitlementsSyncService reconciles the user's
 *      PhysioNet entitlements into dataset researcher roles (USERMGMT__ENTITLEMENTS_*).
 * Both are what Trex phase 5 (upstream-token broker) must reproduce.
 *
 * Gated: needs a PhysioNet upstream + a test account with the mapped entitlement. Dev ships a
 * local PhysioNet stub (localhost:8000), so this is runnable locally/CI once the connector
 * config + a stub account are in place; it self-skips with a logged reason otherwise.
 *
 * Required env (see .env.e2e-idp.example):
 *   LOGTO__CONNECTOR_CONFIG (connectorId physionet-oidc) + LOGTO__SOCIAL_SIGNIN_TARGETS +
 *   USERMGMT__ENTITLEMENTS_* + USERMGMT__AUTO_PROVISION_* must already be applied to the stack.
 *   E2E_PHYSIONET_USERNAME / E2E_PHYSIONET_PASSWORD — a PhysioNet (stub) account.
 *   E2E_PHYSIONET_EXPECTED_ROLE — a dataset researcher role the account's entitlement maps to
 *     (per USERMGMT__ENTITLEMENTS_DATASET_MAPPING), e.g. role.researcher.demo.
 */
import { test, expect } from '../../fixtures'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  USERMGMT,
  assertClaimContract,
  authHeaders,
  decodeToken,
  expectContainsAll,
  findUser,
  loginViaConnector,
  loginViaUI,
  missingEnv,
  readAccessToken,
  resetSession,
  rolesFromToken,
  skipReason,
  syncWebapiRoles,
  webapiRoleNames,
  webapiUserId
} from './_helpers'
// @ts-expect-error - plain .mjs mock, no type declarations
import { startMock } from '../../../mock/physionet-mock.mjs'

const REQUIRED_ENV = ['E2E_PHYSIONET_USERNAME', 'E2E_PHYSIONET_PASSWORD', 'E2E_PHYSIONET_EXPECTED_ROLE']

// Default to a mock upstream so the test needs no external physionet-build. Set
// PHYSIONET_UPSTREAM=real to run against a real PhysioNet at the connector's configured address.
const USE_MOCK = (process.env.PHYSIONET_UPSTREAM ?? 'mock').toLowerCase() !== 'real'
let mock: { stop: () => Promise<void>; port: number } | undefined

test.beforeAll(async () => {
  if (missingEnv(REQUIRED_ENV).length > 0) return
  if (USE_MOCK) {
    mock = await startMock({ port: 8000 })
    console.log(`[mock] PhysioNet upstream mock listening on :${mock.port} (PHYSIONET_UPSTREAM=mock)`)
  } else {
    console.log('[mock] PHYSIONET_UPSTREAM=real — expecting a real physionet-build on the connector address')
  }
})

test.afterAll(async () => {
  await mock?.stop()
})

test('idp:physionet', async ({ page, baseURL }) => {
  test.skip(missingEnv(REQUIRED_ENV).length > 0, skipReason(REQUIRED_ENV))

  const base = baseURL ?? 'https://localhost:41100'
  const creds = {
    username: process.env.E2E_PHYSIONET_USERNAME as string,
    password: process.env.E2E_PHYSIONET_PASSWORD as string
  }
  const expectedRole = process.env.E2E_PHYSIONET_EXPECTED_ROLE as string
  const connector = { target: 'physionet', connectorName: /PhysioNet/i, creds }

  // The JWT customizer reads the upstream access token from a per-email map that the connector
  // populates during getUserInfo and clears after one mint. On a brand-new user's very first login
  // the token can be minted before the Logto user's primaryEmail is committed, so the map lookup
  // misses and physionet_access_token is absent. That only happens once per user, so on a fresh
  // stack (every CI run) retry the login until the passthrough claim appears.
  let userToken = ''
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (attempt > 1) await resetSession(page)
    await loginViaConnector(page, connector)
    userToken = await readAccessToken(page)
    if (decodeToken(userToken).physionet_access_token) break
    console.log(`[assert] attempt ${attempt}: physionet_access_token not in token yet, retrying login`)
  }

  // Base claim contract plus the upstream-token passthrough claim.
  const claims = assertClaimContract(userToken, {
    requiredClaims: ['physionet_access_token']
  })
  console.log(
    `[assert] iss=${claims.iss} sub=${claims.sub} physionet_access_token present=${Boolean(
      claims.physionet_access_token
    )}`
  )

  // Trigger entitlements sync: a `sync` request runs EntitlementsSyncService, which calls PhysioNet's
  // dataset-access endpoint and grants STUDY_RESEARCHER for the mapped dataset. On a first login the
  // token issued above predates that grant, so drive the sync explicitly with the user's own token.
  await page.request.post(`${base}${USERMGMT}/user-group/list`, {
    headers: authHeaders(userToken, base),
    data: { userId: String(claims.sub), sync: true }
  })

  // Re-login for a fresh token and assert the entitlements-derived role. On a brand-new user there's
  // a short lag between the Logto role assignment (done synchronously above) and Logto issuing a
  // token that reflects it, so retry the re-login rather than asserting on the first fresh token.
  let tokenRoles: string[] = []
  let refreshedToken = userToken
  for (let attempt = 1; attempt <= 4; attempt++) {
    await resetSession(page)
    await loginViaConnector(page, connector)
    refreshedToken = await readAccessToken(page)
    tokenRoles = rolesFromToken(refreshedToken)
    if (tokenRoles.includes(expectedRole)) break
    console.log(`[assert] attempt ${attempt}: "${expectedRole}" not in token yet, retrying`)
  }
  console.log(`[assert] refreshed token roles: ${JSON.stringify(tokenRoles)}`)
  await expectContainsAll(tokenRoles, [expectedRole], 'PhysioNet entitlements-derived roles')

  // WebAPI acceptance — the PhysioNet-issued token must work downstream.
  await syncWebapiRoles(page.request, base, refreshedToken)
  const webApiId = await webapiUserId(page.request, base, refreshedToken)
  console.log(`[assert] WebAPI accepted the token; user id ${webApiId}`)

  // Identity linkage + WebAPI roles — read as admin (a user's own token can't list users or
  // read another user's roles).
  await resetSession(page)
  await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminToken = await readAccessToken(page)
  const adminHeaders = authHeaders(adminToken, base)

  const sub = String(claims.sub)
  const user = await findUser(page.request, base, adminHeaders, u => u.idpUserId === sub)
  expect(user, `no usermgmt user linked to idp sub ${sub}`).toBeTruthy()
  expect(user!.active, `usermgmt user ${user!.id} is not active`).not.toBe(false)
  console.log(`[assert] usermgmt user ${user!.id} linked to idp sub (idpUserId === sub)`)

  const webApiRoleNames = await webapiRoleNames(page.request, base, adminToken, webApiId)
  console.log(`[assert] WebAPI roles: ${JSON.stringify(webApiRoleNames)}`)
  await expectContainsAll(
    webApiRoleNames,
    ['cohort reader', 'cohort creator', 'concept set creator'],
    'WebAPI roles for PhysioNet researcher'
  )
})
