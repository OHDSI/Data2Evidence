-- Researcher concept-set permissions (idempotent, runs on every startup)
--
-- WebAPI 2.99 guards the concept-set uniqueness check with
--   isAnyPermitted(anyOf('read:conceptset','write:conceptset'))
-- That expression has no isOwner fallback, because the uniqueness query
-- crosses entities. The `concept set creator` role holds only
-- `create:conceptset`, so a researcher gets HTTP 403 on every save.
--
-- This script only grants. The permission rows belong to the WebAPI flyway
-- migration. If a row is absent, the script raises a WARNING and skips the
-- grant. Do not create the row here. A hand-made row can collide with a
-- later migration.

DO $$
DECLARE
    role_id INTEGER;
    perm_id INTEGER;
    perm TEXT;
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

    SELECT id INTO role_id FROM webapi.sec_role WHERE name = 'concept set creator';
    IF role_id IS NULL THEN
        RAISE WARNING 'Role "concept set creator" not found, skipping researcher concept-set grants';
        RETURN;
    END IF;

    -- Keep the sequence ahead of explicit ids that flyway can insert.
    PERFORM setval('webapi.sec_role_permission_sequence',
        GREATEST(COALESCE((SELECT MAX(id) FROM webapi.sec_role_permission), 0),
                 (SELECT last_value FROM webapi.sec_role_permission_sequence)) + 1, false);

    FOR perm IN SELECT unnest(ARRAY['read:conceptset', 'write:conceptset']) LOOP
        SELECT id INTO perm_id FROM webapi.sec_permission WHERE value = perm;
        IF perm_id IS NULL THEN
            RAISE WARNING 'Permission % is absent from webapi.sec_permission, skipping grant', perm;
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

    RAISE NOTICE 'Researcher concept-set grants: % applied, % skipped, role_id %',
        granted, skipped, role_id;
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
        WHERE p.value IN ('create:conceptset', 'read:conceptset', 'write:conceptset')
        ORDER BY r.name, p.value
    LOOP
        RAISE NOTICE 'concept-set grant: role %, permission % (%)',
            rec.role_name, rec.value, rec.description;
    END LOOP;
END $$;
