/**
 * D2E: grant the per-tenant Postgres roles the privileges Logto's core needs at runtime.
 *
 * Source of truth lives here in the D2E repo. The logto image Dockerfile clones this repo and copies
 * this file to `/etc/logto/packages/core/d2e-grants.mjs`; the alp-logto container entrypoint runs it
 * after `db seed` (see docker-compose.yml) via `node packages/core/d2e-grants.mjs`.
 *
 * Why it's needed: `logto db seed` fast-forwards the alteration watermark to the latest timestamp
 * WITHOUT running any alteration `up()` body, so on a freshly-seeded database the custom privilege
 * alteration never runs, and the roles Logto's core `SET ROLE`s into (`logto_tenant_<db>_default` /
 * `_admin`) are left with no table privileges — the app then fails with
 * `permission denied for table logto_configs`.
 *
 * It reuses @silverhand/slonik (a production dependency of @logto/core, and the very library the
 * original alteration uses) instead of shelling out to `psql`, so the image needs no extra packages.
 * It is idempotent and safe to run on every start, on fresh and existing databases.
 *
 * IMPORTANT: the copy destination must stay inside packages/core so `@silverhand/slonik` resolves from
 * packages/core/node_modules in the pruned production image. DB_URL is read from the environment (the
 * same variable `db seed` uses), so the connection's `search_path` (e.g. `logto`) and database name are
 * honored automatically — role names and the target schema are derived from `current_database()` /
 * `current_schema()`, mirroring the alteration.
 */
import { createPool, sql } from '@silverhand/slonik';

const databaseUrl = process.env.DB_URL;

if (!databaseUrl) {
  console.error('[d2e-grants] DB_URL is not set; cannot apply tenant role grants.');
  process.exit(1);
}

const pool = await createPool(databaseUrl);

try {
  const { currentDatabase } = await pool.one(sql`select current_database() as "currentDatabase"`);
  const { currentSchema } = await pool.one(sql`select current_schema() as "currentSchema"`);
  const database = currentDatabase.replaceAll('-', '_');
  const schema = sql.identifier([currentSchema.replaceAll('-', '_')]);

  for (const tenant of ['admin', 'default']) {
    const roleName = `logto_tenant_${database}_${tenant}`;
    const { exists } = await pool.one(
      sql`select exists(select 1 from pg_roles where rolname = ${roleName}) as "exists"`
    );

    if (!exists) {
      console.log(`[d2e-grants] role ${roleName} does not exist yet; skipping.`);
      continue;
    }

    const role = sql.identifier([roleName]);
    await pool.query(sql`grant usage on schema ${schema} to ${role}`);
    await pool.query(
      sql`grant select, insert, update, delete on all tables in schema ${schema} to ${role}`
    );
    // Cover tables created by future alterations/seed steps too.
    await pool.query(
      sql`alter default privileges in schema ${schema} grant select, insert, update, delete on tables to ${role}`
    );
    console.log(`[d2e-grants] applied grants to ${roleName} (schema ${currentSchema}).`);
  }

  console.log('[d2e-grants] done.');
} catch (error) {
  console.error('[d2e-grants] failed to apply tenant role grants:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
