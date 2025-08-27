# alp-fhir-server

`start.sh` script uses envsubst (for env variable substitution) and jq (for type conversion) tools to add POSTGRES and REDIS database connection parameters to the `medplum.config.json` required by the fhir-server. 

`dist.zip` is the frontend distributable source code of alp-fhir app, built off `v3.1.2`. It has been generated with the below `.env` variables 

```
MEDPLUM_BASE_URL=https://localhost:41100/alp-fhir/
MEDPLUM_CLIENT_ID=
GOOGLE_CLIENT_ID=
RECAPTCHA_SITE_KEY=<refer to the config.json>
MEDPLUM_REGISTER_ENABLED=true
```

`Caddyfile` includes configuration to route requests to the alp-fhir server. The following changes are added - 

- Open port `41130` for serving the UI and re-route the requests to the container `alp-fhir-fe-server`
- Open port `8103` for re-routing requests to the container `alp-fhir-server`

`src/main.ts` seeds the fhir server with a client application to be used by other services. 
- update `FHIR__CLIENT_ID` and `FHIR__CLIENT_SECRET` to create the application with a custom client id and secret 