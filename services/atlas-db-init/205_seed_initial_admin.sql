-- Seed WebAPI admin users from usermgmt ALP_SYSTEM_ADMIN role (idempotent)
-- Reads users with ALP_SYSTEM_ADMIN role from usermgmt and creates them as WebAPI admins
-- Note: If usermgmt schema doesn't exist yet, this will skip gracefully.
-- The WebApiAdminService will handle runtime propagation when users are granted ALP_SYSTEM_ADMIN.
--
-- WebAPI requires each user to have:
-- 1. An entry in sec_user
-- 2. A "personal role" in sec_role with the same name as their login
-- 3. Assignment to their personal role in sec_user_role
-- 4. Assignment to any additional roles (e.g., admin) in sec_user_role

DO $$
DECLARE
    admin_role_id INTEGER;
    rec RECORD;
    new_user_id INTEGER;
    personal_role_id INTEGER;
    users_synced INTEGER := 0;
    schema_exists BOOLEAN;
BEGIN
    -- Check if usermgmt schema AND user table exist
    -- The schema may exist but tables may not have been created yet by the usermgmt service
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'usermgmt' AND table_name = 'user'
    ) INTO schema_exists;

    IF NOT schema_exists THEN
        RAISE NOTICE 'usermgmt.user table not found, skipping admin user seeding (WebApiAdminService will handle runtime sync)';
        RETURN;
    END IF;

    -- Get admin role id from WebAPI
    SELECT id INTO admin_role_id FROM webapi.sec_role WHERE name = 'admin';

    IF admin_role_id IS NULL THEN
        RAISE NOTICE 'WebAPI admin role not found, skipping admin user seeding';
        RETURN;
    END IF;

    -- Find all users with ALP_SYSTEM_ADMIN role in usermgmt
    FOR rec IN
        SELECT DISTINCT u.idp_user_id, u.username
        FROM usermgmt."user" u
        JOIN usermgmt.user_group ug ON u.id = ug.user_id
        JOIN usermgmt.b2c_group g ON ug.b2c_group_id = g.id
        WHERE g.role = 'ALP_SYSTEM_ADMIN'
          AND u.idp_user_id IS NOT NULL
          AND u.active = true
    LOOP
        -- Create user in WebAPI if not exists (using idp_user_id as login)
        INSERT INTO webapi.sec_user (login, name)
        VALUES (rec.idp_user_id, rec.idp_user_id)
        ON CONFLICT (login) DO NOTHING
        RETURNING id INTO new_user_id;

        -- If user already existed, get their id
        IF new_user_id IS NULL THEN
            SELECT id INTO new_user_id FROM webapi.sec_user WHERE login = rec.idp_user_id;
        END IF;

        -- Create personal role for user (WebAPI requires this for permission management)
        -- Personal roles have system_role = false
        INSERT INTO webapi.sec_role (name, system_role)
        VALUES (rec.idp_user_id, false)
        ON CONFLICT DO NOTHING
        RETURNING id INTO personal_role_id;

        -- If personal role already existed, get its id
        IF personal_role_id IS NULL THEN
            SELECT id INTO personal_role_id FROM webapi.sec_role WHERE name = rec.idp_user_id AND system_role = false;
        END IF;

        -- Assign user to their personal role
        IF personal_role_id IS NOT NULL THEN
            INSERT INTO webapi.sec_user_role (user_id, role_id)
            VALUES (new_user_id, personal_role_id)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Assign to admin role if not already assigned
        INSERT INTO webapi.sec_user_role (user_id, role_id)
        VALUES (new_user_id, admin_role_id)
        ON CONFLICT DO NOTHING;

        users_synced := users_synced + 1;
        RAISE NOTICE 'Synced WebAPI admin: % (idp_user_id: %, webapi_user_id: %, personal_role_id: %)', rec.username, rec.idp_user_id, new_user_id, personal_role_id;
    END LOOP;

    IF users_synced = 0 THEN
        RAISE NOTICE 'No ALP_SYSTEM_ADMIN users found in usermgmt to sync';
    ELSE
        RAISE NOTICE 'Synced % ALP_SYSTEM_ADMIN user(s) to WebAPI admin role', users_synced;
    END IF;

    -- Reset sequences to avoid conflicts when WebAPI creates users/roles via OIDC
    -- This ensures the sequences are higher than any manually inserted IDs
    PERFORM setval(
        pg_get_serial_sequence('webapi.sec_user', 'id'),
        COALESCE((SELECT MAX(id) FROM webapi.sec_user), 1)
    );
    RAISE NOTICE 'Reset webapi.sec_user sequence to %', (SELECT MAX(id) FROM webapi.sec_user);

    PERFORM setval(
        pg_get_serial_sequence('webapi.sec_role', 'id'),
        COALESCE((SELECT MAX(id) FROM webapi.sec_role), 1)
    );
    RAISE NOTICE 'Reset webapi.sec_role sequence to %', (SELECT MAX(id) FROM webapi.sec_role);
END $$;

-- Verify WebAPI admin users
SELECT u.id, u.login, r.name as role_name
FROM webapi.sec_user u
JOIN webapi.sec_user_role ur ON u.id = ur.user_id
JOIN webapi.sec_role r ON ur.role_id = r.id
WHERE r.name = 'admin';
