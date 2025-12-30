const _env = Deno.env.toObject();

const certEscapeNewLine = (str: string) => {
  return str.replace(/-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----/gs, (match) => {
    return match.replace(/\n/g, "\\n"); 
  });
}
export const env = {
  FHIR_DATABASE_CODE: _env.FHIR_DATABASE_CODE,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  PG_DB_NAME: _env.PG_DB_NAME,
  PG_ADMIN_USER: _env.PG_ADMIN_USER,
  PG_ADMIN_PASSWORD: _env.PG_ADMIN_PASSWORD,
  FHIR_CUSTOM_SCHEMA: _env.FHIR_CUSTOM_SCHEMA,
  DB_CREDENTIALS_PUBLIC_KEYS: certEscapeNewLine(_env.DB_CREDENTIALS_PUBLIC_KEYS || "").replace('}\\n', '}'),
}

export const services = JSON.parse(env.SERVICE_ROUTES);