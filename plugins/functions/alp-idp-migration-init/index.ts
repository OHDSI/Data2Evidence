// Runs after trex listens ("afterListen" in plugins/functions/package.json):
// every step goes through trex's admin API, which is not reachable while trex
// is still running ordinary init functions.
import knex from 'knex'
import type { Knex } from 'knex'
import { resolveIdpMode } from '@alp/idp/mode.ts'
import { HttpFederationAdmin } from '@alp/idp/migration/federation-admin.ts'
import { runIdpMigration } from '@alp/idp/migration/run.ts'
import { env } from './src/env.ts'
import { KnexMigrationStore } from './src/store.ts'

// Built and torn down inside the try/finally below, not at module scope:
// loading the sibling knexfile runs alp-usermgmt-init's own env module at
// import time, which can throw (e.g. JSON.parse on an env var this function
// doesn't set). A throw there must be caught like any other migration
// failure, not escape as an unhandled module-load error.
let k: Knex | undefined
try {
  const { default: config } = await import('../alp-usermgmt-init/src/db/knexfile-admin.ts')
  k = knex(config)
  await runIdpMigration(
    {
      mode: resolveIdpMode(env.D2E_IDP_MODE),
      logtoIssuer: env.LOGTO_ISSUER,
      clientId: env.LOGTO_UPSTREAM_CLIENT_ID,
      clientSecret: env.LOGTO_UPSTREAM_CLIENT_SECRET,
      publicOrigin: env.PUBLIC_ORIGIN,
      userDomain: env.USER_DOMAIN
    },
    new KnexMigrationStore(k),
    new HttpFederationAdmin({
      federationUrl: env.TREX_FEDERATION_ADMIN_URL,
      rolesUrl: env.TREX_ROLES_ADMIN_URL,
      serviceRoleKey: env.SERVICE_ROLE_KEY
    })
  )
} catch (error) {
  // Never fatal: users already linked keep working, and the next boot retries.
  console.error('[idp-migration] failed; will retry on the next start:', error)
} finally {
  await k?.destroy()
}
