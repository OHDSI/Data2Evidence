export const _env = Deno.env.toObject();

export const env = {
    PG__DB_NAME: _env.PG__DB_NAME,
    PG__HOST: _env.PG__HOST,
    PG__PORT: _env.PG__PORT,
    PG_USER: _env.PG_SUPER_USER,
    PG_PASSWORD: _env.PG_SUPER_PASSWORD,
    PG__SSL: _env.PG__SSL ?? "false",
    PG__CA_ROOT_CERT: _env.PG__CA_ROOT_CERT
}

