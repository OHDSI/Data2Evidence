# Environment Variables

| key                                             | type           | comment                                                                             |
| ----------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `CADDY__D2E__PUBLIC_FQDN`                       | string         | Public FQDN                                                                         |
| `D2E_CPU_LIMIT`                                 | string         | Dynamically Calculated Limit                                                        |
| `D2E_MEMORY_LIMIT`                              | string         | Dynamically Calculated Limit                                                        |
| `DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY` | rsaPrivateKey  | To Encrypt Dbcredentials Entered In Admin>Setup>Databases>Configure (No Passphrase) |
| `DB_CREDENTIALS__INTERNAL__PUBLIC_KEY`          | x509publicKey  | To Encrypt Database Credentials String                                              |
| `DICOM__HEALTH_CHECK_PASSWORD`                  | string         | deprecated                                                                          |
| `DOCKER_TAG_NAME`                               | string         | default tag                                                                         |
| `ENV_TYPE`                                      | string         | local or remote ; also refers to .env.${ENV_TYPE}                                   |
| `GH_TOKEN`                                      | string         | GitHub Token Passed To Trex                                                         |
| `LOGTO_API_M2M_CLIENT_ID`                       | password       | Logto Api M2m Client Id                                                             |
| `LOGTO_API_M2M_CLIENT_SECRET`                   | password       | Logto Api M2m Client Secret                                                         |
| `LOGTO__D2E_APP__CLIENT_ID`                     | string         | Logto Alp App Client Id                                                             |
| `LOGTO__D2E_APP__CLIENT_SECRET`                 | password       | Logto Alp App Client Secret                                                         |
| `LOGTO__D2E_DATA__CLIENT_ID`                    | string         | Logto Alp Data Client Id                                                            |
| `LOGTO__D2E_DATA__CLIENT_SECRET`                | password       | Logto Alp Data Client Secret                                                        |
| `LOGTO__D2E_SVC__CLIENT_ID`                     | string         | Logto Alp Svc Client Id                                                             |
| `LOGTO__D2E_SVC__CLIENT_SECRET`                 | password       | Logto Alp Svc Client Secret                                                         |
| `LOGTO__CLIENTID_PASSWORD__BASIC_AUTH`          | base64 encoded | From `LOGTO_API_M2M_CLIENT_ID` & `LOGTO_API_M2M_CLIENT_SECRET`                      |
| `MINIO__SECRET_KEY`                             | password       | Meilisearch Secret_Key                                                              |
| `PG_ADMIN_PASSWORD`                             | password       | Admin Permissions                                                                   |
| `PG_SUPER_PASSWORD`                             | password       | All Permissions                                                                     |
| `PG_WRITE_PASSWORD`                             | password       | Write Permissions Only                                                              |
| `PG__LOGTO_MANAGER_PASSWORD`                    | string         |
| `REDIS_PASSWORD`                                | string         | Redis Password                                                                      |
| `TLS__CADDY_DIRECTIVE`                          | string         | Generate self-signed or public x509 certificate                                     |
| `USERMGMT__AUTO_PROVISION_ENABLED`              | bool           | Auto-create a usermgmt.user row on first federated OIDC login (default `false`).    |
| `USERMGMT__AUTO_PROVISION_CONNECTORS`           | csv            | Logto social-connector targets allowed to auto-provision (e.g. `physionet,oidc`).   |
| `USERMGMT__AUTO_PROVISION_DEFAULT_TENANT_ID`    | uuid           | Tenant for the default TENANT_VIEWER group; falls back to `APP__TENANT_ID`.         |
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_URL`        | url            | Optional. POSTs `{idpUserId,email,connectorId,accessToken}` and merges `{roles:[]}`.|
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_SECRET`     | password       | Optional bearer token sent to the role hook.                                        |
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_TIMEOUT_MS` | number         | Role hook abort timeout in ms (default `5000`).                                     |
| `USERMGMT__ENTITLEMENTS_SYNC_ENABLED`           | bool           | Reconcile STUDY_RESEARCHER groups against the upstream IdP's entitlements view on every login (default `false`). |
| `USERMGMT__ENTITLEMENTS_PHYSIONET_BASE_URL`     | url            | PhysioNet base URL the entitlements sync calls (e.g. `https://physionet.org`).      |
| `USERMGMT__ENTITLEMENTS_TIMEOUT_MS`             | number         | Entitlements fetch abort timeout in ms (default `10000`).                           |
| `USERMGMT__ENTITLEMENTS_TOKEN_CLAIM`            | string         | JWT claim name carrying the upstream access token (default `physionet_access_token`). |
| `LOGTO__SOCIAL_SIGNIN_TARGETS`                  | csv            | Logto social-connector targets to enable on the sign-in screen. Defaults to the target of `LOGTO__CONNECTOR_CONFIG`. |
