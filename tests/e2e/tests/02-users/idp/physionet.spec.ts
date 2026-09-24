/**
 * IDP path: PhysioNet OIDC — connector `physionet-oidc` (target `physionet`).
 *
 * Covers the connector contract in logto-federated mode: sign in through Logto's PhysioNet
 * connector, auto-provision the usermgmt row, and assert identity linkage. The upstream-token
 * passthrough (`physionet_access_token`) and entitlements-derived roles are not reproduced by
 * trex yet (Trex phase 5), so they are out of scope here.
 *
 * Gated on E2E_PHYSIONET_USERNAME / E2E_PHYSIONET_PASSWORD; ships a local PhysioNet stub
 * (localhost:8000), or set PHYSIONET_UPSTREAM=real to use a real physionet-build.
 */
import { test } from '../../fixtures'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  USERMGMT,
  assertClaimContract,
  assertLinkedBySub,
  authHeaders,
  loginViaConnector,
  loginViaUI,
  missingEnv,
  prelinkLogtoConnectorUser,
  readAccessToken,
  reauthViaLogtoSession,
  resetLogtoConnectorUser,
  resetSession,
  skipReason
} from './_helpers'
// @ts-expect-error - plain .mjs mock, no type declarations
import { startMock } from '../../../mock/physionet-mock.mjs'

const REQUIRED_ENV = ['E2E_PHYSIONET_USERNAME', 'E2E_PHYSIONET_PASSWORD']

// Default to a mock upstream so the test needs no external physionet-build. Set
// PHYSIONET_UPSTREAM=real to run against a real PhysioNet at the connector's configured address.
const USE_MOCK = (process.env.PHYSIONET_UPSTREAM ?? 'mock').toLowerCase() !== 'real'
let mock: { stop: () => Promise<void>; port: number } | undefined

test.beforeAll(async () => {
  if (missingEnv(REQUIRED_ENV).length > 0) return
  if (USE_MOCK) {
    const started = await startMock({ port: 8000 })
    mock = started
    console.log(`[mock] PhysioNet upstream mock listening on :${started.port} (PHYSIONET_UPSTREAM=mock)`)
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
  const connector = { target: 'physionet', connectorName: /PhysioNet/i, creds }

  // Clean slate, then: sign in (creates the Logto user), pre-link in trex, silently re-enter — trex
  // now takes the link branch and issues tokens. See prelinkLogtoConnectorUser for the why.
  await resetLogtoConnectorUser(page.request, base, { target: 'physionet', search: creds.username })
  await loginViaConnector(page, connector)
  await prelinkLogtoConnectorUser(page.request, base, { target: 'physionet', search: creds.username })
  await reauthViaLogtoSession(page)
  const userToken = await readAccessToken(page)
  const claims = assertClaimContract(userToken)
  const sub = String(claims.sub)
  console.log(`[assert] iss=${claims.iss} sub=${sub}`)

  // Provision the usermgmt row (auto-provision runs on sync).
  await page.request.post(`${base}${USERMGMT}/user-group/list`, {
    headers: authHeaders(userToken, base),
    data: { userId: sub, sync: true }
  })

  // Identity linkage — read as admin (a user's own token can't list users); poll, since
  // provisioning happened on this first login.
  await resetSession(page)
  await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminHeaders = authHeaders(await readAccessToken(page), base)
  const user = await assertLinkedBySub(page.request, base, adminHeaders, sub, { poll: true })
  console.log(`[assert] usermgmt user ${user.id} linked to idp sub (idpUserId === sub)`)
})
