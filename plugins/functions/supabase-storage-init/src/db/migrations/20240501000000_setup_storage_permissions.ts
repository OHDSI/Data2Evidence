import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create views in public schema - using CREATE OR REPLACE ensures they're updated if they already exist
  await knex.raw(`
    CREATE OR REPLACE VIEW public.buckets AS SELECT * FROM storage.buckets;
    CREATE OR REPLACE VIEW public.objects AS SELECT * FROM storage.objects;
    CREATE OR REPLACE VIEW public.migrations AS SELECT * FROM storage.migrations;
  `);

  // service_role must hold BYPASSRLS, not just table grants: storage.buckets and
  // storage.objects have row-level security enabled, and a GRANT does not satisfy
  // a row policy. Without it the storage API -- which switches to service_role
  // from the JWT -- fails every bucket insert with "new row violates row-level
  // security policy for table buckets", so no bucket exists and uploads 404.
  //
  // trex's bootstrap creates the same role with BYPASSRLS, but only when it is
  // absent (createGroupRole is IF NOT EXISTS and never alters). Whichever of the
  // two runs first wins, so this migration has to converge on the same shape
  // rather than assume it creates the role.
  //
  // ALTER ROLE needs superuser. Where the migration runs as a lesser role the
  // exception is downgraded to a warning: the grants below still apply, and the
  // bootstrap may already have created the role correctly.
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN INHERIT BYPASSRLS;
      ELSIF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
        ALTER ROLE service_role BYPASSRLS;
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING 'service_role lacks BYPASSRLS and this connection cannot grant it; storage bucket writes will fail until a superuser runs ALTER ROLE service_role BYPASSRLS';
    END $$;
  `);

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
