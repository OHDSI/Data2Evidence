import { env } from "../env.ts";
import config from "./knexfile.ts";

let ssl: any = JSON.parse(env.PG_SSL.toLowerCase())
if (env.PG_CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG_CA_ROOT_CERT
  }
}

config.connection = async () => {
  return {
    host: env.PG__HOST,
    port: env.PG__PORT,
    database: env.PG__DB_NAME,
    user: env.PG_ADMIN_USER!,
    password: env.PG_ADMIN_PASSWORD!,
    ssl
  };
};

export default config;
