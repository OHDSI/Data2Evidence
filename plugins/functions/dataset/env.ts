const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  GATEWAY_WO_PROTOCOL_FQDN: _env.GATEWAY_WO_PROTOCOL_FQDN,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  SUPABASE_STORAGE_JWT_TOKEN: _env.SUPABASE_STORAGE_JWT_TOKEN,
  PG_USER: _env.PG_USER,
  PG_PASSWORD: _env.PG_PASSWORD,
  PG__HOST: _env.PG__HOST,
  PG__PORT: _env.PG__PORT,
  PG__DB_NAME: _env.PG__DB_NAME,
  PG__SSL: _env.PG__SSL,
  PG__CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  FHIR_DATABASE_CODE: _env.FHIR_DATABASE_CODE,
};

export const services = JSON.parse(env.SERVICE_ROUTES);
