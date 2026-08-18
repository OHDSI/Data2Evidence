-- Seed webapi.sec_external_role_map from webapi.sec_role (idempotent, runs on every startup)
--
-- WebAPI resolves OIDC token claims to roles by exact lookup in sec_external_role_map.
-- The Logto JWT customizer already emits scope names that equal WebAPI role names
-- (LOGTO__JWT_SCOPE_REWRITES turns `cohort-reader` into `cohort reader`), so a row per
-- system role reproduces name matching without hand-maintaining a mapping list.
--
-- Only system roles are seeded: OidcGroupToRoleMapper resolves against them, and
-- LoginService only syncs roles that AuthorizationService.getRolesByOrigin returns,
-- which filters on system_role = true. Personal roles are therefore out of scope.

DO $$
DECLARE
    seeded INTEGER := 0;
    pruned INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'sec_external_role_map'
    ) THEN
        RAISE NOTICE 'webapi.sec_external_role_map not found, skipping external role mapping seed';
        RETURN;
    END IF;

    -- Both casings are seeded because security.auth.oidc.rolesToUpperCase decides whether
    -- WebAPI uppercases claim values before this (case-sensitive) lookup.
    INSERT INTO webapi.sec_external_role_map (origin, external_claim, role_id, description)
    SELECT 'OIDC', claim, r.id, 'Auto-seeded from webapi.sec_role'
    FROM webapi.sec_role r
    CROSS JOIN LATERAL (SELECT DISTINCT unnest(ARRAY[upper(r.name), r.name]) AS claim) c
    WHERE r.system_role IS TRUE
    ON CONFLICT ON CONSTRAINT unique_origin_claim_role DO NOTHING;

    GET DIAGNOSTICS seeded = ROW_COUNT;

    -- Drop auto-seeded rows whose role has since been renamed; hand-made mappings
    -- (any other description) are left alone.
    DELETE FROM webapi.sec_external_role_map m
    USING webapi.sec_role r
    WHERE m.role_id = r.id
      AND m.description = 'Auto-seeded from webapi.sec_role'
      AND m.external_claim NOT IN (upper(r.name), r.name);

    GET DIAGNOSTICS pruned = ROW_COUNT;

    RAISE NOTICE 'External role mapping: % row(s) added, % stale row(s) removed', seeded, pruned;
END $$;

-- The verification SELECT that used to live here was gated with psql's \gset
-- and \if. These files are no longer run through psql: trex applies them over
-- the wire protocol, which cannot execute meta-commands, and because the simple
-- query protocol parses the whole file before executing any of it, a single
-- \gset meant NOTHING in this file ran — including the seed above. The counts
-- raised by the DO block cover what the verification query reported.
