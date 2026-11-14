import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // The storage service re-enables row-level security on storage.objects when it
  // migrates, after this table was created with RLS off. service_role is neither
  // owner nor BYPASSRLS, so without a policy every object read and write is denied.
  // Where the superuser owns storage.objects (Helm installs), the chart's
  // storage post-init creates this policy instead.
  await knex.raw(`
    DO $$
    BEGIN
      DROP POLICY IF EXISTS d2e_service_role_all ON storage.objects;
      CREATE POLICY d2e_service_role_all ON storage.objects
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'not owner of storage.objects; skipping d2e_service_role_all';
    END
    $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.objects TO authenticated;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        GRANT SELECT ON public.objects TO anon;
      END IF;
    -- Deployments that ran the standalone storage container have this view
    -- owned by the superuser, with these grants already in place.
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP POLICY IF EXISTS d2e_service_role_all ON storage.objects;`);
}
