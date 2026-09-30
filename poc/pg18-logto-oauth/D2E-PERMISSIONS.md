# How D2E grants database access today, and how PG18 OAuth would fit

Read from the code on 2026-09-30 (branch `feature/MIM-7-pr`). Paths are relative to the
repository root.

## Today: access is decided in the application, not in PostgreSQL

Giving a user access to a dataset never creates or changes anything inside PostgreSQL.

1. **Grant.** A tenant admin calls `POST /usermgmt/api/user-group/register-study-roles`
   (`plugins/functions/alp-usermgmt/src/routes/UserGroupRouter.ts:190-257`), or approves an
   access request (`src/services/StudyAccessRequestService.ts:82-83`). This writes rows in
   `usermgmt.b2c_group` (role, tenant, dataset) and `usermgmt.user_group` (membership).
2. **Role name.** `UserGroupService.buildLogtoRoleName`
   (`src/services/UserGroupService.ts:421-444`) turns a researcher group into
   `role.researcher.<token_dataset_code>`. `token_dataset_code` is a column of
   `portal.dataset`. The role carries the scopes from `datasetResearcherScopes`
   (`plugins/functions/_shared/idp/roles.ts:52-59`): `role.researcher.<code>`,
   `role.researcher.<datasetId>`, `source-user-<datasetId>` (WebAPI datasets) and the
   cohort/concept-set scopes.
3. **Role store.** The role is pushed to the identity provider. The default is now
   **trex** (`docker-compose.yml:597-600`: `USER_MGMT__ROLE_SOURCE=trex`,
   `IDP__ROLE_STORE=trex`), posting to `/trex/admin/roles`. Logto is the legacy store
   (`src/api/LogtoAPI.ts`).
4. **Token.** The IdP puts the user's role scopes into a `roles` claim (Logto via the
   `LOGTO__CUSTOM_JWT` script, trex via its OIDC provider).
5. **Enforcement.** Services read `roles`: WebAPI maps them to `sec_role`s, usermgmt and
   the portal filter datasets, the trex gateway maps roles to route scopes. The gateway's
   enforcement code lives in the external `ghcr.io/ohdsi/trexsql` image, not in this repo.
6. **Data access.** Services connect with **shared per-database credentials**
   (`trex.db` rows with `Admin` / `Read` users, encrypted with `DB_CREDENTIALS__*`).
   End users never get their own PostgreSQL login.

The only PostgreSQL objects per dataset are created when a schema is created, by
`create_and_assign_roles_task`
(`plugins/flows/_shared_flow_utils/create_dataset_tasks.py:54-126`):

- role `<schema>_read_role` with read privileges on the schema
- the database's service `readUser` and `readRole` (e.g. `postgres_tenant_read_role`)
  with read privileges on the schema
- skipped entirely when `IS_SELF_MANAGED_ROLES=true`

## Proposed: token-scoped PostgreSQL logins for Jupyter

The PoC pattern maps onto D2E's existing names:

| PoC | D2E equivalent |
| --- | --- |
| Logto role `jupyter-test` | `role.researcher.<token_dataset_code>` (already created per dataset grant) |
| scope `db:jupyter_test` | scope `role.researcher.<token_dataset_code>` (already on that role) |
| PG login role `jupyter_test` | new `<schema>_jupyter` login, no password, `GRANT <schema>_read_role` |
| `pg_hba` oauth line | one line per dataset: `host <db> <schema>_jupyter all oauth issuer=<public issuer> scope="role.researcher.<code>" map=d2e` |
| `pg_ident` map | `d2e /^(.*)$ <schema>_jupyter` per dataset, or one regex map |

A researcher of dataset X then logs in to the Jupyter hub, the hub requests
`role.researcher.X`, the notebook connects as `X_jupyter` and can only read schema X,
through the read role D2E already maintains.

## Open issues before this works in D2E

1. **Which IdP issues the token.** The role store moved to trex (#3371 "Move the IdP onto
   trex's Better Auth OIDC provider" on develop). The validator needs a JWT access token
   with `iss`, a JWKS endpoint and a `scope` (or `scp`) claim. That has to be checked for
   trex's provider; the PoC only proves it for Logto.
2. **`scope` versus `roles`.** `pg_oidc_validator` checks the `scope` claim. D2E's
   services read the `roles` claim. The hub must request the dataset scopes explicitly
   (Logto has no wildcard), so it needs the list of dataset codes, e.g. from the portal
   API, at login.
3. **Static `pg_hba`.** Every dataset needs a `pg_hba` line and a login role, then
   `pg_reload_conf()`. That belongs in the dataset creation flow next to
   `create_and_assign_roles_task`. The alternative is a custom validator with
   `delegate_ident_mapping` that reads `roles` and picks the role itself, which means
   maintaining C/C++ code.
4. **Public issuer.** Logto's `ENDPOINT` is an internal hostname today
   (`https://d2e-logto-1.<internal domain>:3001`), so tokens carry an internal `iss`. A
   PostgreSQL or JupyterHub on another VM fails the issuer check until the issuer is a
   public HTTPS URL.
5. **Revocation delay.** Removing a dataset grant stops new logins; issued tokens keep
   working until they expire. The token lifetime of the resource should be short.
