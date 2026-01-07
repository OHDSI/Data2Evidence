import { DataSource, DataSourceOptions, LogLevel } from "typeorm";
import { BlobData } from "../entity/blob-data.entity.ts";
import { UserData } from "../entity/user-data.entity.ts";
import { env } from "../env.ts";
import { CreateBlobData1733383345129} from "./migrations/1733383345129-create-blob-data.ts"
import { CreateUserData1733383366413 } from "./migrations/1733383366413-create-user-data.ts";

export const getLogLevels = (): LogLevel[] => {
  if (env.NODE_ENV === "production") {
    return ["log", "info", "warn", "error", "migration"];
  }
  return ["log", "info", "warn", "error", "migration", "query", "schema"];
};

let ssl = JSON.parse(env.PG__SSL.toLowerCase());
if (env.PG__CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG__CA_ROOT_CERT,
  };
}

export const migrationDataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: env.PG__HOST,
  port: env.PG__PORT,
  username: env.PG_ADMIN_USER,
  password: env.PG_ADMIN_PASSWORD,
  database: env.PG__DB_NAME,
  schema: env.PG_SCHEMA,
  ssl,
  logging: getLogLevels(),
  entities: [UserData, BlobData],
  migrations: [CreateBlobData1733383345129, CreateUserData1733383366413],
};

const migrationDataSource = new DataSource(migrationDataSourceOptions);
migrationDataSource.driver.supportedDataTypes.push("oid");
export default migrationDataSource;
