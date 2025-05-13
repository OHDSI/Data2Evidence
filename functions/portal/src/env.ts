import process from "node:process";

const _env = Deno.env.toObject();

export const env = {
  SERVICE_ROUTES: process.env.SERVICE_ROUTES || "{}",
  NODE_ENV: _env.NODE_ENV,
  TENANT_ID: _env.APP__TENANT_ID,
  TENANT_NAME: _env.APP__TENANT_NAME,
  SYSTEM_NAME: _env.ALP__SYSTEM_NAME,

  TREX_API_URL: JSON.parse(process.env.SERVICE_ROUTES || '{ "trex": "" }').trex,

  PG_HOST: _env.PG_HOST,
  PG_PORT: parseInt(<string>_env.PG_PORT),
  PG_DATABASE: _env.PG_DATABASE,
  PG_SCHEMA: "portal",
  PG_USER: _env.PG_USER,
  PG_PASSWORD: _env.PG_PASSWORD,
  PG_MANAGE_USER: _env.PG_MANAGE_USER,
  PG_MANAGE_PASSWORD: _env.PG_MANAGE_PASSWORD,
  PG_SSL: _env.PG__SSL,
  PG_CA_ROOT_CERT: _env.PG__CA_ROOT_CERT,
  PG_MAX_POOL: parseInt(_env.PG__MAX_POOL) || 10,

  MINIO_ENDPOINT: _env.MINIO__ENDPOINT,
  MINIO_PORT: _env.MINIO__PORT,
  MINIO_SSL: _env.MINIO__SSL,
  MINIO_REGION: _env.MINIO__REGION,
  MINIO_ACCESS_KEY: _env.MINIO__ACCESS_KEY,
  MINIO_SECRET_KEY: _env.MINIO__SECRET_KEY,

  SUPABASE_STORAGE_JWT_SECRET: _env.SUPABASE_STORAGE_JWT_SECRET,
  SUPABASE_STORAGE_JWT_TOKEN: _env.SUPABASE_STORAGE_JWT_TOKEN,

  SSL_CA_CERT: _env.SSL_CA_CERT
};

export const services = JSON.parse(env.SERVICE_ROUTES);
