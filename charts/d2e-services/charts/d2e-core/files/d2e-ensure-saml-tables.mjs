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

const TABLE = 'saml_application_sessions';

// The statements below are copied verbatim from the alteration that creates
// this table (1.23.0-1735012422) and from applyTableRls() in its
// utils/1704934999-tables.js, rather than imported from them.
//
// packages/cli/alteration-scripts is populated at container start, not baked
// into the image -- its mtime is the container's start time while its parent
// carries the image build date. This script runs between `db seed` and
// `db alteration deploy`, when those files are not yet present, so importing
// the alteration fails with ERR_MODULE_NOT_FOUND. Inlining keeps the repair
// independent of when that directory is filled in.

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
    console.log(`[d2e-ensure-saml] ${TABLE} is missing; recreating it.`);

    const { currentDatabase } = await pool.one(
      sql`select current_database() as "currentDatabase"`
    );
    const baseRole = sql.identifier([`logto_tenant_${currentDatabase.replaceAll('-', '_')}`]);
    const table = sql.identifier([TABLE]);

    // One transaction: a failure between the CREATE and the RLS statements
    // would otherwise leave the table present but unprotected, and the guard
    // above would skip it on every later run -- leaving the tenant roles
    // permanently without privileges on it.
    //
    // relay_state is varchar(256) here, matching the original alteration;
    // 1.35.0-1765255453 widens it to 512 when the chain replays afterwards.
    //
    // The alteration watermark is deliberately NOT advanced: it already
    // records this alteration as applied. This restores the object the
    // rollback removed, it does not re-apply the alteration.
    await pool.transaction(async (connection) => {
      await connection.query(sql`
        create table ${table} (
          tenant_id varchar(21) not null
            references tenants (id) on update cascade on delete cascade,
          id varchar(32) not null,
          application_id varchar(21) not null
            references applications (id) on update cascade on delete cascade,
          saml_request_id varchar(128) not null,
          oidc_state varchar(32),
          relay_state varchar(256),
          raw_auth_request text not null,
          created_at timestamptz not null default(now()),
          expires_at timestamptz not null,
          primary key (tenant_id, id),
          constraint saml_application_sessions__application_type
            check (check_application_type(application_id, 'SAML'))
        );
      `);

      // Verbatim from applyTableRls() in utils/1704934999-tables.js.
      await connection.query(sql`
        create trigger set_tenant_id before insert on ${table}
          for each row execute procedure set_tenant_id();

        alter table ${table} enable row level security;

        create policy ${sql.identifier([`${TABLE}_tenant_id`])} on ${table}
          as restrictive
          using (tenant_id = (select id from tenants where db_user = current_user));

        create policy ${sql.identifier([`${TABLE}_modification`])} on ${table}
          using (true);

        grant select, insert, update, delete on ${table} to ${baseRole};
      `);
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
