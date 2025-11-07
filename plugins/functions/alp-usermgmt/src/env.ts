type LoggingLevel = 'info' | 'warn' | 'error'

const _env = Deno.env.toObject();

export const env = {
  USER_MGMT_PATH: Deno.env.get("USER_MGMT__PATH")!,
  USER_MGMT_PORT: Number(Deno.env.get("USER_MGMT__PORT")!) || 9002,
  USER_MGMT_LOG_LEVEL: (Deno.env.get("USER_MGMT__LOG_LEVEL") as LoggingLevel) || 'info',
  USER_MGMT_IDP_SUBJECT_PROP: Deno.env.get("USER_MGMT__IDP_SUBJECT_PROP")!,
  PG_HOST: Deno.env.get("PG__HOST")!,
  PG_PORT: Number(Deno.env.get("PG__PORT")!),
  PG_DB_NAME: Deno.env.get("PG__USER_MGMT__DB_NAME")!,
  PG_SCHEMA: Deno.env.get("PG__USER_MGMT__SCHEMA")!,
  PG_USER: Deno.env.get("PG__USER_MGMT__USER")!,
  PG_PASSWORD: Deno.env.get("PG__USER_MGMT__PASSWORD")!,
  PG_ADMIN_USER: Deno.env.get("PG__USER_MGMT__ADMIN_USER")!,
  PG_ADMIN_PASSWORD: Deno.env.get("PG__USER_MGMT__ADMIN_PASSWORD")!,
  PG_CA_ROOT_CERT: Deno.env.get("PG__CA_ROOT_CERT"),
  PG_MIN_POOL: Number(Deno.env.get("PG__MIN_POOL")),
  PG_MAX_POOL: Number(Deno.env.get("PG__MAX_POOL")) || 10,
  PG_DEBUG: Boolean(Number(Deno.env.get("PG_DEBUG"))) || false,
  PG__IDLE_TIMEOUT_IN_MS: Number(Deno.env.get("PG__IDLE_TIMEOUT_IN_MS")) || 30000,
  NIFI_MGMT_BASE_URL: Deno.env.get("NIFI_MGMT__BASE_URL"),
  ALP_SYSTEM_NAME: Deno.env.get("ALP__SYSTEM_NAME"),
  APP_TENANT_ID: Deno.env.get("APP__TENANT_ID"),
  IDP_BASE_URL: Deno.env.get("IDP__BASE_URL"),
  IDP_RELYING_PARTY: Deno.env.get("IDP__RELYING_PARTY"),
  IDP_FETCH_USER_INFO_TYPE: Deno.env.get("IDP__FETCH_USER_INFO_TYPE"),
  IDP_ALP_ADMIN_CLIENT_ID: Deno.env.get("IDP__ALP_ADMIN__CLIENT_ID"),
  IDP_ALP_ADMIN_CLIENT_SECRET: Deno.env.get("IDP__ALP_ADMIN__CLIENT_SECRET"),
  IDP_ALP_ADMIN_RESOURCE: Deno.env.get("IDP__ALP_ADMIN__RESOURCE"),
  SSL_PRIVATE_KEY: Deno.env.get("TLS__INTERNAL__KEY")?.replace(/\\n/g, '\n'),
  SSL_PUBLIC_CERT: Deno.env.get("TLS__INTERNAL__CRT")?.replace(/\\n/g, '\n'),
  SSL_CA_CERT: Deno.env.get("TLS__INTERNAL__CA_CRT")?.replace(/\\n/g, '\n'),
  SERVICE_ROUTES: Deno.env.get("SERVICE_ROUTES") || '{}',
  NODE_ENV: _env.NODE_ENV,
  PG_SSL: _env.PG__SSL,
  APP__TENANT_ID: _env.APP__TENANT_ID,
  IDP__INITIAL_USER__UUID: _env.IDP__INITIAL_USER__UUID,
  IDP__INITIAL_USER__NAME: _env.IDP__INITIAL_USER__NAME
}

export const services = JSON.parse(env.SERVICE_ROUTES)
