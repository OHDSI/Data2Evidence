const _env = Deno.env.toObject();

export const env = {
  NODE_ENV: _env.NODE_ENV,
  GIT__USERNAME: _env.GIT__USERNAME,
  GIT__EMAIL: _env.GIT__EMAIL,
};

export const services = JSON.parse(_env.SERVICE_ROUTES || "{}");
