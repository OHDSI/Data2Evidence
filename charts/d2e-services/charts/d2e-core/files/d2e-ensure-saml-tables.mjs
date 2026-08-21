/**
 * D2E: re-create the SAML session table on databases where a historical
 * `alteration rollback` dropped it.
 *
 * Why it's needed: the 0.17.x logto-seed-init ran
 *   `db alteration rollback 1.23.0 && db alteration deploy 1.23.1`
 * The rollback executed the down() of 1.23.0-1735012422-add-saml-application-
 * sessions-table.js, which drops `saml_application_sessions`. Deploying forward
 * again never re-runs it, because alterations replay by timestamp watermark, so
 * the table stays missing while the watermark records it as applied.
 *
 * That is latent until the chain reaches
 * 1.35.0-1765255453-update-saml-session-relay-state-to-varchar-512.js, which
 * ALTERs the table and fails with `relation "saml_application_sessions" does
 * not exist`. It runs in a transaction, so nothing is applied and
 * logto-seed-init crash-loops, taking idp -- and every service that waits on
 * it -- down.
 *
 * Fresh databases are unaffected: `db seed` creates the table from the baked
 * baseline (packages/schemas/tables/saml_application_sessions.sql).
 *
 * This re-runs the original alteration's up() rather than issuing DDL, so the
 * table gets its row-level security policies via applyTableRls() exactly as a
 * normal deployment would -- a bare CREATE TABLE would leave the tenant roles
 * without access. The later alteration widens relay_state 256 -> 512, so
 * running this first and then deploying forward lands on the correct shape.
 *
 * Idempotent and safe on every start: when the table is present it does
 * nothing. Mirrors d2e-grants.mjs -- it must live in packages/core so the bare
 * `@silverhand/slonik` import resolves from packages/core/node_modules.
 */
import { createPool, sql } from '@silverhand/slonik';
import { pathToFileURL } from 'node:url';

const TABLE = 'saml_application_sessions';

// Absolute path, NOT a specifier relative to this module. This file is
// delivered as a Kubernetes subPath mount, so its realpath is under
// /var/lib/kubelet/... -- and Node's ESM loader resolves relative specifiers
// against the realpath, which would look for the alteration next to the
// kubelet volume and fail with ERR_MODULE_NOT_FOUND.
const ALTERATION_PATH =
  '/etc/logto/packages/cli/alteration-scripts/1.23.0-1735012422-add-saml-application-sessions-table.js';

const databaseUrl = process.env.DB_URL;

if (!databaseUrl) {
  console.error('[d2e-ensure-saml] DB_URL is not set; cannot check for the SAML session table.');
  process.exit(1);
}

const pool = await createPool(databaseUrl);

try {
  const { present } = await pool.one(
    sql`select to_regclass(${TABLE}) is not null as "present"`
  );

  if (present) {
    console.log(`[d2e-ensure-saml] ${TABLE} already present; nothing to do.`);
  } else {
    console.log(`[d2e-ensure-saml] ${TABLE} is missing; replaying its creating alteration.`);
    const { default: alteration } = await import(pathToFileURL(ALTERATION_PATH).href);

    // Mirror the CLI's deployAlteration: beforeUp outside the transaction, up()
    // inside one. Without the transaction a failure part-way through up() would
    // leave the table created but its RLS policies unapplied -- and the guard
    // above would then skip it on every later run, permanently leaving the
    // tenant roles without privileges.
    //
    // The alteration timestamp is deliberately NOT advanced: the watermark
    // already records this alteration as applied. This repairs the object the
    // rollback removed, it does not re-apply the alteration.
    if (alteration.beforeUp) {
      await alteration.beforeUp(pool);
    }
    await pool.transaction(async (connection) => {
      await alteration.up(connection);
    });
    const { confirmed } = await pool.one(
      sql`select to_regclass(${TABLE}) is not null as "confirmed"`
    );
    if (!confirmed) {
      throw new Error(`${TABLE} still missing after replaying the alteration`);
    }
    console.log(`[d2e-ensure-saml] created ${TABLE} and applied its RLS policies.`);
  }
} finally {
  await pool.end();
}
