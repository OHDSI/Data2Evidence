/**
 * IDP path: Logto native (username/password) — the CI-safe baseline, runs on every PR.
 *
 * A usermgmt-provisioned user logs in on the Logto form; we assert the auth-provider claim
 * contract (roles, preferred_username/username, email, iss/aud) and that WebAPI accepts the token.
 * Every later `D2E_IDP=trex` phase must re-pass this unchanged. The entra / entra-external-id /
 * physionet paths exercise the same contract through connectors, gated on secrets.
 */
import { test, expect } from '../../fixtures'
import type { APIRequestContext } from '@playwright/test'
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  assertClaimContract,
  authHeaders,
  deleteUser,
  expectContainsAll,
  findUser,
  grantResearcher,
  grantSystemAdmin,
  loginViaUI,
  provisionUser,
  readAccessToken,
  resetSession,
  resolveWebapiDataset,
  rolesFromToken,
  syncWebapiRoles,
  webapiUserId
} from './_helpers'

const NEW_USER_PASSWORD = 'Updatepassword12345'

test('idp:logto-native', async ({ page, baseURL }) => {
  const api: APIRequestContext = page.request
  const base = baseURL ?? 'https://localhost:443'
  const username = `ituser_${Date.now()}`

  let adminToken = ''
  let userId = ''

  try {
    await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
    adminToken = await readAccessToken(page)
    const adminHeaders = authHeaders(adminToken, base)

    const { datasetId, datasetCode, tenantId } = await resolveWebapiDataset(api, base, adminHeaders)
    console.log(`[setup] dataset ${datasetId} (code ${datasetCode}, tenant ${tenantId})`)

    userId = await provisionUser(api, base, adminHeaders, username, NEW_USER_PASSWORD)
    console.log(`[setup] created user ${username} (usermgmt id ${userId})`)

    await grantSystemAdmin(api, base, adminHeaders, userId)
    await grantResearcher(api, base, adminHeaders, { userId, tenantId, studyId: datasetId })

    // Real browser login proves the password works.
    await resetSession(page)
    await loginViaUI(page, username, NEW_USER_PASSWORD)
    const userToken = await readAccessToken(page)

    const claims = assertClaimContract(userToken)
    console.log(`[assert] iss=${claims.iss} sub=${claims.sub} name=${claims.preferred_username ?? claims.username ?? claims.name}`)

    const tokenRoles = rolesFromToken(userToken)
    console.log(`[assert] token roles: ${JSON.stringify(tokenRoles)}`)
    await expectContainsAll(
      tokenRoles,
      [
        'admin',
        'role.systemadmin',
        'anonymous',
        `Source user (${datasetId})`,
        'cohort reader',
        'cohort creator',
        'concept set creator',
        `role.researcher.${datasetCode}`
      ],
      'token roles claim'
    )

    // Prove WebAPI accepts the token downstream. The per-role WebAPI assertion is intentionally
    // omitted (as in the entra / entra-external-id specs): it depends on syncWebapiRoles, which hits
    // WebAPI's `openidDirect` decoder — and that decoder resolves JWKS from the PUBLIC issuer, which
    // a localhost stack cannot reach from inside the container (same class as the RP-logout issue).
    // The token-roles assertion above already covers the usermgmt -> token role contract.
    await syncWebapiRoles(api, base, userToken)
    const webApiUserId = await webapiUserId(api, base, userToken)
    console.log(`[assert] WebAPI accepted the token; user id ${webApiUserId}`)

    // The usermgmt row must be bound to the token subject by idp_user_id, not merely share a username.
    const sub = String(claims.sub)
    const linked = await findUser(api, base, adminHeaders, u => u.id === userId)
    expect(linked, `usermgmt user ${userId} not found`).toBeTruthy()
    expect(linked!.idpUserId, `usermgmt user ${userId} not linked to idp sub ${sub}`).toBe(sub)
    expect(linked!.active, `usermgmt user ${userId} is not active`).not.toBe(false)
    console.log(`[assert] usermgmt user ${userId} linked to idp sub (idpUserId === sub)`)
  } finally {
    if (adminToken && userId) {
      await deleteUser(api, base, authHeaders(adminToken, base), userId)
    }
  }
})
