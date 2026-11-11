# Environment variables

All of the following environment varialbles are required to operate the system.

| key                                             | type           | comment                                                                              |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `CADDY__D2E__PUBLIC_FQDN`                       | string         | Public FQDN                                                                          |
| `DOCKER_TAG_NAME`                               | string         | Default tag                                                                          |
| `ENV_TYPE`                                      | string         | Local or remote; also refers to `.env.${ENV_TYPE}`                                   |
| `LOGTO__D2E_APP__CLIENT_ID`                     | string         | Logto D2E app client ID                                                              |
| `LOGTO__D2E_APP__CLIENT_SECRET`                 | password       | Logto D2E app client secret                                                          |
| `LOGTO__D2E_DATA__CLIENT_ID`                    | string         | Logto D2E data client ID                                                             |
| `LOGTO__D2E_DATA__CLIENT_SECRET`                | password       | Logto D2E data client secret                                                         |
| `LOGTO__D2E_SVC__CLIENT_ID`                     | string         | Logto D2E svc client ID                                                              |
| `LOGTO__D2E_SVC__CLIENT_SECRET`                 | password       | Logto D2E svc client secret                                                          |
| `LOGTO_API_M2M_CLIENT_ID`                       | string         | Logto API M2M client ID                                                              |
| `LOGTO_API_M2M_CLIENT_SECRET`                   | password       | Logto API M2M client secret                                                          |
| `MINIO__SECRET_KEY`                             | password       | Meilisearch Secret_Key                                                                     |
| `PG_ADMIN_PASSWORD`                             | password       | Admin permissions                                                                    |
| `PG_SUPER_PASSWORD`                             | password       | All permissions                                                                      |
| `PG_WRITE_PASSWORD`                             | password       | Write permissions only                                                               |
| `PG_STUDY_RESULTS_ADMIN_PASSWORD`               | password       | Study results admin permissions                                                      |
| `PG_STUDY_RESULTS_READ_PASSWORD`                | password       | Study results read permissions                                                       |
| `DEMO__DB_PASSWORD`                             | string         | Generated password                                                                   |
| `TLS__CADDY_DIRECTIVE`                          | string         | Generate self-signed or public x509 certificate                                      |
| `PROJECT_NAME`                                  | string         | Default project name                                                                 |
| `USER_MGMT__ROLE_SOURCE`                        | string         | Role source for user management (e.g. `logto`)                                       |
| `LOGTO__CLIENTID_PASSWORD__BASIC_AUTH`          | base64 encoded | From `LOGTO_API_M2M_CLIENT_ID` & `LOGTO_API_M2M_CLIENT_SECRET`                      |
| `PG__LOGTO_MANAGER_PASSWORD`                    | password       | Logto manager password                                                               |
| `DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY` | rsaPrivateKey  | To encrypt DB credentials entered in Admin>Setup>Databases>Configure (no passphrase) |
| `DB_CREDENTIALS__INTERNAL__PUBLIC_KEY`          | x509publicKey  | To encrypt DB credentials string                                                     |
| `D2E_CPU_LIMIT`                                 | string         | Dynamically calculated limit                                                         |
| `D2E_MEMORY_LIMIT`                              | string         | Dynamically calculated limit                                                         |
| `D2E_SWAP_LIMIT`                                | string         | Dynamically calculated limit                                                         |
| `RESOURCE_UPLOAD_MAX_FILE_SIZE_MB`              | number         | Optional. Max size per resource file in MB (default `25`)                            |
| `RESOURCE_UPLOAD_ALLOWED_EXTENSIONS`            | string         | Optional. Accepted resource file types (default `pdf,csv,json,xlsx,docx,sql,md,txt`) |

## Resource upload rules

Admins can attach files to a data source under **Admin > Data sources > Resources**. Two variables control which files are accepted. Both the upload dialog and the backend read them, so the rules shown to users always match the rules enforced.

- `RESOURCE_UPLOAD_MAX_FILE_SIZE_MB`: the largest file allowed, in MB. Empty files are always rejected.
- `RESOURCE_UPLOAD_ALLOWED_EXTENSIONS`: a comma-separated list of file extensions, without dots. Case doesn't matter.

Only these types can be enabled: `pdf`, `csv`, `json`, `xlsx`, `docx`, `sql`, `md` and `txt`. Any other value (for example `exe` or `html`) is ignored and logged as a warning. You can narrow the list but not widen it.

To change the rules:

- **Docker Compose:** edit the values in `.env.local` (or your `.env` file), then restart with `d2e stop` and `d2e start`.
- **Helm:** set `config.RESOURCE_UPLOAD_MAX_FILE_SIZE_MB` and `config.RESOURCE_UPLOAD_ALLOWED_EXTENSIONS` in your values file, then redeploy.

```bash
# Example: allow only PDF and CSV files up to 10 MB
RESOURCE_UPLOAD_MAX_FILE_SIZE_MB=10
RESOURCE_UPLOAD_ALLOWED_EXTENSIONS=pdf,csv
```
