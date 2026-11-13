import { Knex } from "knex";
import { env } from "../../env.ts";

export async function up(knex: Knex): Promise<void> {
  // The portal and dataset services list objects with direct SQL as the
  // write user. With row-level security on and no policy for that role, those
  // queries silently return no rows.
  const writer = `"${env.PG_USER.replace(/"/g, '""')}"`;
  await knex.raw(`
    DO $$
    BEGIN
      DROP POLICY IF EXISTS d2e_writer_read ON storage.objects;
      CREATE POLICY d2e_writer_read ON storage.objects
        FOR SELECT TO ${writer} USING (true);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'not owner of storage.objects; skipping d2e_writer_read';
    END
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP POLICY IF EXISTS d2e_writer_read ON storage.objects;`);
}
