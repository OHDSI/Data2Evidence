import config from "./knexfile.ts";

const _env = Deno.env.toObject();

config.connection = async () => {
  let ssl = JSON.parse(_env.PG__SSL.toLowerCase());
  if (_env.PG__CA_ROOT_CERT) {
    ssl = {
      rejectUnauthorized: true,
      ca: _env.PG__CA_ROOT_CERT,
    };
  }

  return {
    host: _env.PG__HOST!,
    port: Number(_env.PG__PORT),
    database: _env.PG__DB_NAME!,
    user: _env.PG_ADMIN_USER!,
    password: _env.PG_ADMIN_PASSWORD!,
    ssl,
  };
};

export default config;
