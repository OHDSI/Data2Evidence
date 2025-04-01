# Environment Variables

| key                                             | type           | comment                                                                             |
| ----------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `CADDY__ALP__PUBLIC_FQDN`                       | string         | Public FQDN                                                                         |
| `D2E_CPU_LIMIT`                                 | string         | Dynamically Calculated Limit                                                        |
| `D2E_MEMORY_LIMIT`                              | string         | Dynamically Calculated Limit                                                        |
| `DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY` | rsaPrivateKey  | To Encrypt Dbcredentials Entered In Admin>Setup>Databases>Configure (No Passphrase) |
| `DB_CREDENTIALS__INTERNAL__PUBLIC_KEY`          | x509publicKey  | To Encrypt Database Credentials String                                              |
| `DICOM__HEALTH_CHECK_PASSWORD`                  | string         | deprecated                                                                          |
| `DOCKER_TAG_NAME`                               | string         | default tag                                                                         |
| `ENV_TYPE`                                      | string         | local or remote ; also refers to .env.${ENV_TYPE}                                   |
| `FHIR__CLIENT_SECRET`                           | string         | FHIR Client Secret                                                                  |
| `GH_TOKEN`                                      | string         | GitHub Token Passed To Trex                                                         |
| `LOGTO_API_M2M_CLIENT_ID`                       | password       | Logto Api M2m Client Id                                                             |
| `LOGTO_API_M2M_CLIENT_SECRET`                   | password       | Logto Api M2m Client Secret                                                         |
| `LOGTO__ALP_APP__CLIENT_ID`                     | string         | Logto Alp App Client Id                                                             |
| `LOGTO__ALP_APP__CLIENT_SECRET`                 | password       | Logto Alp App Client Secret                                                         |
| `LOGTO__ALP_DATA__CLIENT_ID`                    | string         | Logto Alp Data Client Id                                                            |
| `LOGTO__ALP_DATA__CLIENT_SECRET`                | password       | Logto Alp Data Client Secret                                                        |
| `LOGTO__ALP_SVC__CLIENT_ID`                     | string         | Logto Alp Svc Client Id                                                             |
| `LOGTO__ALP_SVC__CLIENT_SECRET`                 | password       | Logto Alp Svc Client Secret                                                         |
| `LOGTO__CLIENTID_PASSWORD__BASIC_AUTH`          | base64 encoded | From `LOGTO_API_M2M_CLIENT_ID` & `LOGTO_API_M2M_CLIENT_SECRET`                      |
| `MINIO__SECRET_KEY`                             | password       | Meilisearch Secret_Key                                                              |
| `PG_ADMIN_PASSWORD`                             | password       | Admin Permissions                                                                   |
| `PG_SUPER_PASSWORD`                             | password       | All Permissions                                                                     |
| `PG_WRITE_PASSWORD`                             | password       | Write Permissions Only                                                              |
| `PG__LOGTO_MANAGER_PASSWORD`                    | string         |
| `REDIS_PASSWORD`                                | string         | Redis Password                                                                      |
| `STRATEGUS__KEYRING_PASSWORD`                   | string         | Strategus Keyring Password                                                          |
| `TLS__CADDY_DIRECTIVE`                          | string         | Generate self-signed or public x509 certificate                                     |
