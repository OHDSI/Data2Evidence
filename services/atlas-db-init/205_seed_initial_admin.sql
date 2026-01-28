-- Seed WebAPI admin users from Logto role.systemadmin role (idempotent)
-- Reads users with role.systemadmin role from Logto and creates them as WebAPI admins
-- This uses Logto tables directly to avoid timing issues with usermgmt migrations.
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
    logto_schema_exists BOOLEAN;
BEGIN
    -- Check if logto schema and users table exist
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'logto' AND table_name = 'users'
    ) INTO logto_schema_exists;

    IF NOT logto_schema_exists THEN
        RAISE NOTICE 'logto.users table not found, skipping admin user seeding';
        RETURN;
    END IF;

    -- Get admin role id from WebAPI
    SELECT id INTO admin_role_id FROM webapi.sec_role WHERE name = 'admin';

    IF admin_role_id IS NULL THEN
        RAISE NOTICE 'WebAPI admin role not found, skipping admin user seeding';
        RETURN;
    END IF;

    -- Find all users with role.systemadmin role in Logto
    -- Logto user.id is the same as idp_user_id in usermgmt
    FOR rec IN
        SELECT DISTINCT u.id as idp_user_id, u.username
        FROM logto.users u
        JOIN logto.users_roles ur ON u.id = ur.user_id
        JOIN logto.roles r ON ur.role_id = r.id
        WHERE r.name = 'role.systemadmin'
          AND u.is_suspended = false
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
        RAISE NOTICE 'No role.systemadmin users found in Logto to sync';
    ELSE
        RAISE NOTICE 'Synced % role.systemadmin user(s) from Logto to WebAPI admin role', users_synced;
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
