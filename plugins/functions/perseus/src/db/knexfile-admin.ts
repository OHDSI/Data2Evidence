import config from "./knexfile.ts";
import { env } from "../env.ts";

let ssl = JSON.parse(env.PG__SSL.toLowerCase())
if (env.PG__CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG__CA_ROOT_CERT,
  }
}

config.connection = async () => {
  return {
    host: env.PG__HOST,
    port: env.PG__PORT,
    database: env.PG__DB_NAME,
    user: env.PG_ADMIN_USER!,
    password: env.PG_ADMIN_PASSWORD!,
    ssl,
  };
};

export default config;
