const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  SERVICE_ROUTES: _env.SERVICE_ROUTES || "{}",
};

export const services = JSON.parse(env.SERVICE_ROUTES);
