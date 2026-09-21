/**
 * IDP path: Microsoft Entra External ID (CIAM) — connector `entra-external-id-alp`.
 *
 * The easiest connector to reason about: sign-in + auto-provision, no group->role mapping.
 * We drive the connector button on the Logto sign-in screen, complete the upstream CIAM
 * login, and assert the base claim contract plus that the federated user was auto-provisioned
 * into usermgmt. This is the behaviour Trex phase 3 (generic-OIDC federation) must reproduce.
 *
 * Gated: needs a real CIAM tenant + test account (no self-hostable upstream), so it self-skips
 * with a logged reason unless its secrets are set. Runs as a nightly/manual job.
 *
 * Required env (see .env.e2e-idp.example):
 *   LOGTO__CONNECTOR_CONFIG (connectorId entra-external-id-alp) + LOGTO__SOCIAL_SIGNIN_TARGETS
 *   must already be applied to the running stack.
 *   E2E_ENTRA_EXTID_USERNAME / E2E_ENTRA_EXTID_PASSWORD — a CIAM test account.
 */
import { test } from '../../fixtures'
import type { APIRequestContext } from '@playwright/test'
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
  readAccessToken,
  resetSession,
  skipReason,
  syncWebapiRoles,
  webapiUserId
} from './_helpers'

const REQUIRED_ENV = ['E2E_ENTRA_EXTID_USERNAME', 'E2E_ENTRA_EXTID_PASSWORD']

test('idp:entra-external-id', async ({ page, baseURL }) => {
  test.skip(missingEnv(REQUIRED_ENV).length > 0, skipReason(REQUIRED_ENV))

  const api: APIRequestContext = page.request
  const base = baseURL ?? 'https://localhost:443'
  const creds = {
    username: process.env.E2E_ENTRA_EXTID_USERNAME as string,
    password: process.env.E2E_ENTRA_EXTID_PASSWORD as string
  }

  await loginViaConnector(page, {
    target: 'entra-external-id-alp',
    // The connector metadata name.en is "Microsoft Entra External ID".
    connectorName: /Entra External ID/i,
    creds
  })
  const userToken = await readAccessToken(page)

  // Base claim contract (no group-derived roles for CIAM).
  const claims = assertClaimContract(userToken)
  // Never log the email/username — mask it so the diagnostic is useful without leaking PII.
  const email = String(claims.email ?? '').toLowerCase()
  const maskedEmail = email ? email.replace(/(.).*(@.*)/, '$1***$2') : '(none)'
  const sub = String(claims.sub)
  console.log(`[assert] iss=${claims.iss} sub=${sub} email=${maskedEmail}`)

  // Trigger provisioning + prove the token works downstream. A `sync` request runs
  // grant-roles-by-scopes, which auto-provisions the usermgmt row via IDP__AUTO_PROVISION_USERS
  // (CIAM does NOT use USERMGMT__AUTO_PROVISION_CONNECTORS). Then WebAPI must accept the token.
  await api.post(`${base}${USERMGMT}/user-group/list`, {
    headers: authHeaders(userToken, base),
    data: { userId: sub, sync: true }
  })
  await syncWebapiRoles(api, base, userToken)
  const webApiId = await webapiUserId(api, base, userToken)
  console.log(`[assert] WebAPI accepted the token; user id ${webApiId}`)

  // Identity linkage — the usermgmt row must be bound to the token subject by idp_user_id, not
  // merely share an email. Read as admin (the user's own token can't list users); poll, since
  // provisioning happened on this first login.
  await resetSession(page)
  await loginViaUI(page, ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminHeaders = authHeaders(await readAccessToken(page), base)

  const linked = await assertLinkedBySub(api, base, adminHeaders, sub, { poll: true, label: maskedEmail })
  console.log(`[assert] CIAM user ${maskedEmail} linked to idp sub (idpUserId === sub), user ${linked.id}`)
})
