const _env = Deno.env.toObject();

const certEscapeNewLine = (str: string) => {
  return str.replace(/-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----/gs, (match) => {
    return match.replace(/\n/g, "\\n"); 
  });
}
export const env = {
  FHIR_DATABASE_CODE: _env.FHIR_DATABASE_CODE,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  PG__HOST: _env.PG__HOST,
  PG__PORT: _env.PG__PORT,
  PG__MAX_POOL: _env.PG__MAX_POOL,
  PG__IDLE_TIMEOUT_IN_MS: _env.PG__IDLE_TIMEOUT_IN_MS,
  PG_DB_NAME: _env.PG_DB_NAME,
  PG_ADMIN_USER: _env.PG_ADMIN_USER,
  PG_ADMIN_PASSWORD: _env.PG_ADMIN_PASSWORD,
  FHIR_CUSTOM_SCHEMA: _env.FHIR_CUSTOM_SCHEMA,
  ALP_GATEWAY_OAUTH__URL: _env.ALP_GATEWAY_OAUTH__URL,
  IDP__ALP_DATA__CLIENT_ID: _env.IDP__ALP_DATA_CLIENT_ID,
  IDP__ALP_DATA__CLIENT_SECRET: _env.LOGTO__ALP_DATA__CLIENT_SECRET,
  DB_CREDENTIALS_PUBLIC_KEYS: certEscapeNewLine(_env.DB_CREDENTIALS__PUBLIC_KEYS || "").replace('}\\n', '}'),
}
export const services = JSON.parse(env.SERVICE_ROUTES);