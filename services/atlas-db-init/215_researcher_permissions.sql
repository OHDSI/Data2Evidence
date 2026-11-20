-- Researcher WebAPI permissions (idempotent, runs on every startup)
--
-- Every researcher holds `cohort creator` and `concept set creator` through
-- WEBAPI_RESEARCHER_SCOPES. Those roles need more than WebAPI seeds them with:
--
-- * WebAPI 2.99 guards the concept-set uniqueness check with
--     isAnyPermitted(anyOf('read:conceptset','write:conceptset'))
--   That expression has no isOwner fallback, because the uniqueness query
--   crosses entities. With only `create:conceptset`, a researcher gets HTTP 403
--   on every save.
-- * Atlas enables "New" on the Characterizations, Feature Analyses, Incidence
--   Rates and Cohort Pathways tabs only for create:cohort-characterization,
--   create:feature-analysis, create:incidence and create:pathway, which no role
--   but admin holds.
--
-- This script only grants. The role and permission rows belong to WebAPI's
-- flyway migrations. If a row is absent, the script raises a WARNING and skips
-- the grant. Do not create the row here. A hand-made row can collide with a
-- later migration.

DO $$
DECLARE
    g RECORD;
    role_id INTEGER;
    perm_id INTEGER;
    granted INTEGER := 0;
    skipped INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'sec_role_permission'
    ) THEN
        RAISE NOTICE 'webapi.sec_role_permission not found, skipping researcher grants';
        RETURN;
    END IF;

    -- Keep the sequence ahead of explicit ids that flyway can insert.
    PERFORM setval('webapi.sec_role_permission_sequence',
        GREATEST(COALESCE((SELECT MAX(id) FROM webapi.sec_role_permission), 0),
                 (SELECT last_value FROM webapi.sec_role_permission_sequence)) + 1, false);

    FOR g IN SELECT * FROM (VALUES
        ('concept set creator', 'read:conceptset'),
        ('concept set creator', 'write:conceptset'),
        ('cohort creator', 'create:cohort-characterization'),
        ('cohort creator', 'read:cohort-characterization'),
        ('cohort creator', 'write:cohort-characterization'),
        ('cohort creator', 'create:feature-analysis'),
        ('cohort creator', 'read:feature-analysis'),
        ('cohort creator', 'write:feature-analysis'),
        ('cohort creator', 'create:incidence'),
        ('cohort creator', 'read:incidence'),
        ('cohort creator', 'write:incidence'),
        ('cohort creator', 'create:pathway'),
        ('cohort creator', 'read:pathway'),
        ('cohort creator', 'write:pathway')
    ) AS t(role_name, perm) LOOP
        SELECT id INTO role_id FROM webapi.sec_role WHERE name = g.role_name;
        SELECT id INTO perm_id FROM webapi.sec_permission WHERE value = g.perm;
        IF role_id IS NULL OR perm_id IS NULL THEN
            RAISE WARNING 'Role "%" or permission % is absent, skipping grant', g.role_name, g.perm;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        INSERT INTO webapi.sec_role_permission (role_id, permission_id)
        VALUES (role_id, perm_id)
        ON CONFLICT ON CONSTRAINT role_permission_unique DO NOTHING;

        -- FOUND is false when the conflict does nothing, so reruns do not
        -- report grants that already existed.
        IF FOUND THEN
            granted := granted + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Researcher grants: % applied, % skipped', granted, skipped;
END $$;

-- Verify
-- Guarded by the same table check as the grant block. The scripts run under
-- ON_ERROR_STOP=1, so an unguarded query on a missing table would fail the
-- init even though the grant block above skipped cleanly.
DO $$
DECLARE
    rec RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'sec_role_permission'
    ) THEN
        RAISE NOTICE 'webapi.sec_role_permission not found, skipping verification';
        RETURN;
    END IF;

    FOR rec IN
        SELECT r.name AS role_name, p.value, p.description
        FROM webapi.sec_role_permission rp
        JOIN webapi.sec_role r ON rp.role_id = r.id
        JOIN webapi.sec_permission p ON rp.permission_id = p.id
        WHERE p.value ~ '^(create|read|write):(conceptset|cohort-characterization|feature-analysis|incidence|pathway)$'
        ORDER BY r.name, p.value
    LOOP
        RAISE NOTICE 'researcher grant: role %, permission % (%)',
            rec.role_name, rec.value, rec.description;
    END LOOP;
END $$;
