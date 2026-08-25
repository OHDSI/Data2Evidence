import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // The storage service enables row-level security on storage.buckets, which with
  // no policy denies every role that is neither the table owner nor BYPASSRLS.
  // service_role is neither, so it sees zero rows and the storage API reports
  // NoSuchBucket for buckets that exist.
  await knex.raw(`
    DROP POLICY IF EXISTS d2e_service_role_all ON storage.buckets;
    CREATE POLICY d2e_service_role_all ON storage.buckets
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP POLICY IF EXISTS d2e_service_role_all ON storage.buckets;`);
}
