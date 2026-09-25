/**
 * IDP path: Microsoft Entra ID / Azure AD — connector `azuread-alp`.
 *
 * The distinguishing behaviour: after the upstream token exchange the connector calls MS Graph
 * (/me/memberOf) and maps the user's Azure groups to Logto roles via LOGTO_ROLES_AZ_GROUPS_MAPPING.
 * We drive the connector login and assert the base claim contract, the mapped group role in the
 * token, WebAPI acceptance of the token, and the usermgmt identity linkage. This is the behaviour
 * Trex phase 4 (MS-Graph group resolver) must reproduce.
 *
 * Gated: needs a real Azure AD tenant + an MFA-exempt test account that is a member of the mapped
 * group (no self-hostable upstream), so it self-skips unless its E2E_* secrets are set.
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

  await loginViaConnector(page, {
    target: 'azuread-alp',
    // The connector metadata name.en is "Data2Evidence".
    connectorName: /Data2Evidence|Azure|Entra|Microsoft/i,
    creds
  })
  const userToken = await readAccessToken(page)

  // Base contract + the Azure group -> role mapping (memberOf -> LOGTO_ROLES_AZ_GROUPS_MAPPING).
  const claims = assertClaimContract(userToken)
  const sub = String(claims.sub)
  console.log(`[assert] iss=${claims.iss} sub=${sub}`)
  const tokenRoles = rolesFromToken(userToken)
  console.log(`[assert] token roles: ${JSON.stringify(tokenRoles)}`)
  await expectContainsAll(tokenRoles, [expectedRole], 'Entra group-derived roles')

  // Trigger provisioning + prove the token works downstream (WebAPI must accept it).
  await api.post(`${base}${USERMGMT}/user-group/list`, {
    headers: authHeaders(userToken, base),
    data: { userId: sub, sync: true }
  })
  await syncWebapiRoles(api, base, userToken)
  const webApiId = await webapiUserId(api, base, userToken)
  console.log(`[assert] WebAPI accepted the token; user id ${webApiId}`)

  // Identity linkage — the usermgmt row must be bound to the token subject by idp_user_id.
  // Read as admin (the user's own token can't list users); poll for the first-login row.
  await resetSession(page)
  await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminHeaders = authHeaders(await readAccessToken(page), base)

  const linked = await assertLinkedBySub(api, base, adminHeaders, sub, { poll: true })
  console.log(`[assert] Entra user linked to idp sub (idpUserId === sub), user ${linked.id}`)
})
