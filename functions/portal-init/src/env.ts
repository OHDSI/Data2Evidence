const _env = Deno.env.toObject();

export const env = {
  PG_HOST: _env.PG_HOST,
  PG_PORT: parseInt(_env.PG_PORT),
  PG_MANAGE_USER: _env.PG_MANAGE_USER,
  PG_MANAGE_PASSWORD: _env.PG_MANAGE_PASSWORD,
  PG_DATABASE: _env.PG_DATABASE,
  PG_SCHEMA: _env.PG_SCHEMA,
  PG__SSL: _env.PG__SSL,
  PG__CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  PG__MAX_POOL: _env.PG__MAX_POOL,
};
