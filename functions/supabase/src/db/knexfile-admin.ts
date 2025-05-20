import { env } from "../env.ts";
import config from "./knexfile.ts";

config.connection = async () => {
  return {
    host: env.PG__HOST,
    port: env.PG__PORT,
    database: env.PG__DB_NAME,
    user: env.PG_ADMIN_USER!,
    password: env.PG_ADMIN_PASSWORD!,
  };
};

export default config;
