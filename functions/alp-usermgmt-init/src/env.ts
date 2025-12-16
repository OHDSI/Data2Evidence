const _env = Deno.env.toObject();

export const env = {
  USER_MGMT_PATH: Deno.env.get("USER_MGMT__PATH")!,
  PG_HOST: Deno.env.get("PG__HOST")!,
  PG_PORT: Number(Deno.env.get("PG__PORT")!),
  PG_DB_NAME: Deno.env.get("PG__USER_MGMT__DB_NAME")!,
  PG_SCHEMA: Deno.env.get("PG__USER_MGMT__SCHEMA")!,
  PG_USER: Deno.env.get("PG__USER_MGMT__USER")!,
  PG_PASSWORD: Deno.env.get("PG__USER_MGMT__PASSWORD")!,
  PG_ADMIN_USER: Deno.env.get("PG__USER_MGMT__ADMIN_USER")!,
  PG_ADMIN_PASSWORD: Deno.env.get("PG__USER_MGMT__ADMIN_PASSWORD")!,
  PG_CA_ROOT_CERT: Deno.env.get("PG__CA_ROOT_CERT"),
  PG_MIN_POOL: Number(Deno.env.get("PG__MIN_POOL")),
  PG_MAX_POOL: Number(Deno.env.get("PG__MAX_POOL")) || 10,
  PG_DEBUG: Boolean(Number(Deno.env.get("PG_DEBUG"))) || false,
  PG__IDLE_TIMEOUT_IN_MS: Number(Deno.env.get("PG__IDLE_TIMEOUT_IN_MS")) || 30000,
  NODE_ENV: _env.NODE_ENV,
  PG_SSL: _env.PG__SSL,
}
