import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create views in public schema - using CREATE OR REPLACE ensures they're updated if they already exist
  await knex.raw(`
    CREATE OR REPLACE VIEW public.buckets AS SELECT * FROM storage.buckets;
    CREATE OR REPLACE VIEW public.objects AS SELECT * FROM storage.objects;
    CREATE OR REPLACE VIEW public.migrations AS SELECT * FROM storage.migrations;
  `);

  // Check if service_role exists before granting permissions
  const roleExists = await knex.raw(`
    SELECT 1 FROM pg_roles WHERE rolname = 'service_role'
  `);

  // Create service_role if it doesn't exist
  if (!roleExists.rows || roleExists.rows.length === 0) {
    await knex.raw(`
      CREATE ROLE service_role;
    `);
  }

  // Grant permissions to service_role
  await knex.raw(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.buckets TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.objects TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.migrations TO service_role;
  `);

  // Grant permissions on sequences
  await knex.raw(`
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO service_role;
  `);

  // Grant permissions on storage schema
  await knex.raw(`
    GRANT USAGE ON SCHEMA storage TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO service_role;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Revoke permissions from service_role
  await knex.raw(`
    REVOKE SELECT, INSERT, UPDATE, DELETE ON public.buckets FROM service_role;
    REVOKE SELECT, INSERT, UPDATE, DELETE ON public.objects FROM service_role;
    REVOKE SELECT, INSERT, UPDATE, DELETE ON public.migrations FROM service_role;
  `);

  // Revoke permissions on sequences
  await knex.raw(`
    REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage FROM service_role;
  `);

  // Revoke permissions on storage schema
  await knex.raw(`
    REVOKE USAGE ON SCHEMA storage FROM service_role;
    REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage FROM service_role;
  `);

  // Drop views in public schema
  await knex.raw(`
    DROP VIEW IF EXISTS public.buckets;
    DROP VIEW IF EXISTS public.objects;
    DROP VIEW IF EXISTS public.migrations;
  `);
}
