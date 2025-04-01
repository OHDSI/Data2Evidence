const _env = Deno.env.toObject();

export const env = {
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
  NODE_ENV: _env.NODE_ENV,
  PG_USER: _env["PG_USER"],
  PG_PASSWORD: _env["PG_PASSWORD"],
  PG_HOST: _env["PG_HOST"],
  PG_PORT: _env["PG_PORT"],
  PG_DATABASE: _env["PG_DATABASE"],
};

export const services = JSON.parse(env.SERVICE_ROUTES);
