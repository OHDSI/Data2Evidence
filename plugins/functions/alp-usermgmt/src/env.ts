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
  ALP_SYSTEM_NAME: Deno.env.get("ALP__SYSTEM_NAME"),
  APP_TENANT_ID: Deno.env.get("APP__TENANT_ID"),
  IDP_BASE_URL: Deno.env.get("IDP__BASE_URL"),
  IDP_RELYING_PARTY: Deno.env.get("IDP__RELYING_PARTY"),
  IDP_AUTO_PROVISION_USERS:
    Deno.env.get("IDP__AUTO_PROVISION_USERS") === 'true' ||
    Deno.env.get("IDP__RELYING_PARTY") === 'azure',
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
  IDP__INITIAL_USER__NAME: _env.IDP__INITIAL_USER__NAME,
  AUTO_GRANT_RESEARCHER_BY_DATASET_CODES:
    _env.AUTO_GRANT_RESEARCHER_BY_DATASET_CODES || _env.AZ_AUTO_GRANT_RESEARCHER_BY_DATASET_CODES,
  USER_MGMT_ROLE_SOURCE: Deno.env.get("USER_MGMT__ROLE_SOURCE"),
  PHYSIONET_LINKING_ENABLED: (Deno.env.get('PHYSIONET__LINKING_ENABLED') ?? 'false') === 'true',
  PHYSIONET_OAUTH_BASE_URL: Deno.env.get('PHYSIONET__OAUTH__BASE_URL') ?? '',
  PHYSIONET_OAUTH_CLIENT_ID: Deno.env.get('PHYSIONET__OAUTH__CLIENT_ID') ?? '',
  PHYSIONET_OAUTH_CLIENT_SECRET: Deno.env.get('PHYSIONET__OAUTH__CLIENT_SECRET') ?? '',
  PHYSIONET_OAUTH_REDIRECT_URI: Deno.env.get('PHYSIONET__OAUTH__REDIRECT_URI') ?? '',
  PHYSIONET_OAUTH_SCOPES: Deno.env.get('PHYSIONET__OAUTH__SCOPES') ?? 'credentialing:read profile:read',
  PHYSIONET_SYNC_TTL_SECONDS: Number(Deno.env.get('PHYSIONET__SYNC_TTL_SECONDS') ?? '3600'),
  LINKED_ACCOUNT_ENC_KEY: Deno.env.get('LINKED_ACCOUNT__ENC_KEY') ?? '',
}

export const services = JSON.parse(env.SERVICE_ROUTES)

export const getAutoGrantDatasetCodes = (): string[] => {
  const raw = env.AUTO_GRANT_RESEARCHER_BY_DATASET_CODES
  if (!raw) return []
  return raw.split(',').map(c => c.trim()).filter(c => c)
}

export const assertPhysionetEnv = (): void => {
  if (!env.PHYSIONET_LINKING_ENABLED) return
  const missing: string[] = []
  if (!env.PHYSIONET_OAUTH_BASE_URL) missing.push('PHYSIONET__OAUTH__BASE_URL')
  if (!env.PHYSIONET_OAUTH_CLIENT_ID) missing.push('PHYSIONET__OAUTH__CLIENT_ID')
  if (!env.PHYSIONET_OAUTH_CLIENT_SECRET) missing.push('PHYSIONET__OAUTH__CLIENT_SECRET')
  if (!env.PHYSIONET_OAUTH_REDIRECT_URI) missing.push('PHYSIONET__OAUTH__REDIRECT_URI')
  if (!env.LINKED_ACCOUNT_ENC_KEY) missing.push('LINKED_ACCOUNT__ENC_KEY')
  if (missing.length) throw new Error(`PHYSIONET__LINKING_ENABLED=true but missing: ${missing.join(', ')}`)
}
