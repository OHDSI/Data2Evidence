/**
 * IDP path: Microsoft Entra ID / Azure AD — connector `azuread-alp`.
 *
 * Distinguishing behaviour: after the upstream token exchange the connector calls MS Graph
 * (/me/memberOf) and maps the user's Azure groups to Logto roles via LOGTO_ROLES_AZ_GROUPS_MAPPING.
 * This is the behaviour Trex phase 4 (MS-Graph group resolver) must reproduce.
 *
 * Gated: needs a real Azure AD tenant + an MFA-exempt test account in the mapped group
 * (no self-hostable upstream), so it self-skips unless its E2E_* secrets are set.
 *
 * Required env (see .env.entra.example):
 *   Stack: npm run start:entra  (azuread-alp connector + LOGTO_ROLES_AZ_GROUPS_MAPPING)
 *   E2E_ENTRA_USERNAME / E2E_ENTRA_PASSWORD — an Azure AD account in the mapped group.
 *   E2E_ENTRA_EXPECTED_ROLE — the Logto role that account's group maps to (e.g. role.researcher.demo).
 */
import { test } from '../../fixtures'
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  USERMGMT,
  assertClaimContract,
  assertLinkedBySub,
  authHeaders,
  expectContainsAll,
  loginViaConnector,
  loginViaUI,
  missingEnv,
  readAccessToken,
  resetLogtoConnectorUser,
  resetSession,
  rolesFromToken,
  skipReason,
  syncWebapiRoles,
  webapiUserId
} from './_helpers'

const REQUIRED_ENV = ['E2E_ENTRA_USERNAME', 'E2E_ENTRA_PASSWORD', 'E2E_ENTRA_EXPECTED_ROLE']

test('idp:entra', async ({ page, baseURL }) => {
  test.skip(missingEnv(REQUIRED_ENV).length > 0, skipReason(REQUIRED_ENV))

  const api = page.request
  const base = baseURL ?? 'https://localhost:41100'
  const creds = {
    username: process.env.E2E_ENTRA_USERNAME as string,
    password: process.env.E2E_ENTRA_PASSWORD as string
  }
  const expectedRole = process.env.E2E_ENTRA_EXPECTED_ROLE as string

  // Sign in once — trex auto-provisions the first-time connector user and issues tokens directly
  // (resolve-user provisions on first sign-in; no pre-link). Interactive MFA is done once here.
  const connector = {
    target: 'azuread-alp',
    // Connector metadata name.en is "Data2Evidence".
    connectorName: /Data2Evidence|Azure|Entra|Microsoft/i,
    creds
  }
  await resetLogtoConnectorUser(api, base, { target: 'azuread-alp' })
  await loginViaConnector(page, connector)
  const userToken = await readAccessToken(page)

  // Base claim contract; group-derived roles are asserted after the sync below.
  const claims = assertClaimContract(userToken)
  const sub = String(claims.sub)
  console.log(`[assert] iss=${claims.iss} sub=${sub}`)

  // trex carries the Azure groups as `idp_groups` but never maps them to roles (memberOf ->
  // LOGTO_ROLES_AZ_GROUPS_MAPPING is resolved downstream): the usermgmt sync reads that claim and
  // writes trexdb.user_role via trex /assign, so the role lands on the NEXT token. Trigger the sync,
  // then re-auth (silently through the live Entra session) until the group-derived role appears.
  await api.post(`${base}${USERMGMT}/user-group/list`, {
    headers: authHeaders(userToken, base),
    data: { userId: sub, sync: true }
  })

  let downstreamToken = userToken
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (rolesFromToken(downstreamToken).length > 0) break
    console.log(`[assert] attempt ${attempt}: token carries no roles yet, forcing a fresh token`)
    // Drop ONLY the portal's cached OIDC token (keep the trex/Logto session cookies, so no re-MFA);
    // re-entering the portal then auto-starts OIDC and mints a FRESH token reflecting the roles the
    // sync just wrote. A plain re-enter can't be used — it returns the cached token without refreshing.
    await page.evaluate(() =>
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('oidc.default:'))
        .forEach((k) => sessionStorage.removeItem(k))
    )
    await page.goto('/d2e/portal').catch(() => {})
    downstreamToken = await readAccessToken(page)
  }
  const tokenRoles = rolesFromToken(downstreamToken)
  console.log(`[assert] token roles: ${JSON.stringify(tokenRoles)}`)
  await expectContainsAll(tokenRoles, [expectedRole], 'Entra group-derived roles')

  // Prove WebAPI accepts the token downstream.
  await syncWebapiRoles(api, base, downstreamToken)
  const webApiId = await webapiUserId(api, base, downstreamToken)
  console.log(`[assert] WebAPI accepted the token; user id ${webApiId}`)

  // Identity linkage: usermgmt row must be bound to the token subject by idp_user_id.
  // Read as admin (the user's own token can't list users); poll for the first-login row.
  await resetSession(page)
  await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminHeaders = authHeaders(await readAccessToken(page), base)

  const linked = await assertLinkedBySub(api, base, adminHeaders, sub, { poll: true })
  console.log(`[assert] Entra user linked to idp sub (idpUserId === sub), user ${linked.id}`)
})
