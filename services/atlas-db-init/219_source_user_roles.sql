-- Keep webapi.sec_external_role_map in step with system roles as they are created,
-- and repair sources that are missing their "Source user (<key>)" role (idempotent,
-- runs on every startup, before 220_external_role_map.sql backfills the map).
--
-- WebAPI only resolves OIDC role claims through sec_external_role_map, and 220 seeds
-- it once per trex start. WebAPI creates "Source user (<key>)" when a dataset is
-- registered as a source (SourceService.createSource), so without a trigger users
-- granted a new dataset get no Atlas access to it until trex restarts.
--
-- createSource saves the source before it adds the role and grants it WRITE on the
-- source, so a failure in between (or a source inserted by hand) leaves a source no
-- role can reach. The repair below recreates the role and grant; the trigger then
-- maps it.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'sec_external_role_map'
    ) THEN
        RAISE NOTICE 'webapi.sec_external_role_map not found, skipping source user role sync';
        RETURN;
    END IF;

    -- The trigger runs inside WebAPI's role insert, so it must never fail: conflicts
    -- are ignored and it only touches auto-seeded rows. Same claims and description
    -- as 220, which also prunes anything the trigger misses.
    BEGIN
        EXECUTE $ddl$
            CREATE OR REPLACE FUNCTION webapi.sec_role_sync_external_role_map()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $fn$
            BEGIN
                IF TG_OP = 'UPDATE' THEN
                    DELETE FROM webapi.sec_external_role_map m
                    WHERE m.role_id = NEW.id
                      AND m.description = 'Auto-seeded from webapi.sec_role'
                      AND (NEW.system_role IS NOT TRUE
                           OR m.external_claim NOT IN (upper(NEW.name), NEW.name));
                END IF;

                IF NEW.system_role IS TRUE AND NEW.name IS NOT NULL THEN
                    INSERT INTO webapi.sec_external_role_map (origin, external_claim, role_id, description)
                    SELECT DISTINCT 'OIDC', claim, NEW.id, 'Auto-seeded from webapi.sec_role'
                    FROM unnest(ARRAY[upper(NEW.name), NEW.name]) AS claim
                    ON CONFLICT ON CONSTRAINT unique_origin_claim_role DO NOTHING;
                END IF;

                RETURN NULL;
            EXCEPTION WHEN OTHERS THEN
                -- e.g. WebAPI's DB user may not write the map table; 220 maps the
                -- role on the next start instead of failing WebAPI's role insert.
                RAISE WARNING 'sec_role_sync_external_role_map: role % not mapped: %', NEW.name, SQLERRM;
                RETURN NULL;
            END
            $fn$
        $ddl$;

        -- DROP + CREATE rather than CREATE OR REPLACE TRIGGER, which needs PostgreSQL 14.
        EXECUTE 'DROP TRIGGER IF EXISTS sec_role_sync_external_role_map ON webapi.sec_role';
        EXECUTE $ddl$
            CREATE TRIGGER sec_role_sync_external_role_map
            AFTER INSERT OR UPDATE OF name, system_role ON webapi.sec_role
            FOR EACH ROW
            EXECUTE FUNCTION webapi.sec_role_sync_external_role_map()
        $ddl$;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE WARNING 'Cannot install the sec_role mapping trigger (%); new source roles will only be mapped on the next trex start', SQLERRM;
    END;
END $$;

DO $$
DECLARE
    roles_added INTEGER := 0;
    grants_added INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'sec_source'
    ) THEN
        RAISE NOTICE 'webapi.sec_source not found, skipping source user role repair';
        RETURN;
    END IF;

    INSERT INTO webapi.sec_role (name, system_role)
    SELECT 'Source user (' || s.source_key || ')', TRUE
    FROM webapi.source s
    WHERE s.deleted_date IS NULL
    ON CONFLICT ON CONSTRAINT sec_role_name_uq DO NOTHING;

    GET DIAGNOSTICS roles_added = ROW_COUNT;

    -- WebAPI grants the source role WRITE on its source (SourceService.createSource).
    INSERT INTO webapi.sec_source (role_id, source_id, access_type)
    SELECT r.id, s.source_id, 'WRITE'
    FROM webapi.source s
    JOIN webapi.sec_role r
      ON r.name = 'Source user (' || s.source_key || ')' AND r.system_role IS TRUE
    WHERE s.deleted_date IS NULL
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS grants_added = ROW_COUNT;

    RAISE NOTICE 'Source user roles: % role(s) and % source grant(s) restored', roles_added, grants_added;
END $$;

-- Do not use psql meta-commands (\gset, \if) in this file: trex applies it over
-- the wire protocol, and the simple query protocol parses the whole file before
-- executing any of it, so one meta-command stops every statement from running.
