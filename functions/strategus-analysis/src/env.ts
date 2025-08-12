const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  PG__HOST: _env.PG_HOST,
  PG__PORT: _env.PG_PORT,
  PG_USER: _env.PG_USER,
  PG_PASSWORD: _env.PG_PASSWORD,
  PG__DB_NAME: _env.PG_DATABASE,
  PG_SCHEMA: _env.PG_SCHEMA,
  PG__SSL: _env.PG__SSL,
  PG__CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  PG_ADMIN_USER: _env.PG_ADMIN_USER,
  PG_ADMIN_PASSWORD: _env.PG_ADMIN_PASSWORD,
};

export const services = JSON.parse(env.SERVICE_ROUTES);
