const _env = Deno.env.toObject();

const certEscapeNewLine = (str: string) => {
  return str.replace(/-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----/gs, (match) => {
    return match.replace(/\n/g, "\\n");
  });
}
export const env = {
  NODE_ENV: _env.NODE_ENV,
  FHIR_DATABASE_CODE: _env.FHIR_DATABASE_CODE,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  TREX_SQL_HOST: _env.TREX__SQL__HOST,
  TREX_SQL_PORT: _env.TREX__SQL__PORT,
  TREX_SQL_USER: _env.TREX__SQL__USER,
  TREX_SQL_PASSWORD: _env.TREX__SQL__PASSWORD,
  FHIR_DB_NAME: _env.FHIR__DB_NAME,
  ALP_GATEWAY_OAUTH__URL: _env.ALP_GATEWAY_OAUTH__URL,
  IDP__ALP_DATA__CLIENT_ID: _env.IDP__ALP_DATA_CLIENT_ID,
  IDP__ALP_DATA__CLIENT_SECRET: _env.IDP__ALP_DATA__CLIENT_SECRET,
  DB_CREDENTIALS_PUBLIC_KEYS: certEscapeNewLine(_env.DB_CREDENTIALS__PUBLIC_KEYS || "").replace('}\\n', '}'),
}
export const services = JSON.parse(env.SERVICE_ROUTES);
