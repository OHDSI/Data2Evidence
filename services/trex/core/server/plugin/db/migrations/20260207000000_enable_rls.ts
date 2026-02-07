export async function up(knex: any): Promise<void> {
  // Create non-login role for PostGraphile sessions
  await knex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'trex_graphql_user') THEN
        CREATE ROLE trex_graphql_user NOLOGIN;
      END IF;
    END $$
  `);

  // Grant the role to current user (PG_MANAGE_USER) so SET ROLE works
  await knex.raw(`GRANT trex_graphql_user TO current_user`);

  // Grant schema + table access
  await knex.raw(`GRANT USAGE ON SCHEMA trex TO trex_graphql_user`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON trex.plugins TO trex_graphql_user`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON trex.db TO trex_graphql_user`);

  // Enable RLS
  await knex.raw(`ALTER TABLE trex.plugins ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE trex.db ENABLE ROW LEVEL SECURITY`);

  // Admin-only policies: allow all when user has ALP_SYSTEM_ADMIN role
  // COALESCE + nullif handles: NULL (no setting) → '[]', empty string → '[]'
  // ?| checks if jsonb array contains any of the listed strings
  await knex.raw(`
    CREATE POLICY admin_full_access ON trex.plugins
      FOR ALL
      TO trex_graphql_user
      USING (
        COALESCE(nullif(current_setting('app.user_roles', true), ''), '[]')::jsonb
          ?| array['ALP_SYSTEM_ADMIN']
      )
      WITH CHECK (
        COALESCE(nullif(current_setting('app.user_roles', true), ''), '[]')::jsonb
          ?| array['ALP_SYSTEM_ADMIN']
      )
  `);

  await knex.raw(`
    CREATE POLICY admin_full_access ON trex.db
      FOR ALL
      TO trex_graphql_user
      USING (
        COALESCE(nullif(current_setting('app.user_roles', true), ''), '[]')::jsonb
          ?| array['ALP_SYSTEM_ADMIN']
      )
      WITH CHECK (
        COALESCE(nullif(current_setting('app.user_roles', true), ''), '[]')::jsonb
          ?| array['ALP_SYSTEM_ADMIN']
      )
  `);
}

export async function down(knex: any): Promise<void> {
  await knex.raw(`DROP POLICY IF EXISTS admin_full_access ON trex.plugins`);
  await knex.raw(`DROP POLICY IF EXISTS admin_full_access ON trex.db`);
  await knex.raw(`ALTER TABLE trex.plugins DISABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE trex.db DISABLE ROW LEVEL SECURITY`);
  await knex.raw(`REVOKE ALL ON trex.plugins FROM trex_graphql_user`);
  await knex.raw(`REVOKE ALL ON trex.db FROM trex_graphql_user`);
  await knex.raw(`REVOKE USAGE ON SCHEMA trex FROM trex_graphql_user`);
  await knex.raw(`REVOKE trex_graphql_user FROM current_user`);
  await knex.raw(`DROP ROLE IF EXISTS trex_graphql_user`);
}
