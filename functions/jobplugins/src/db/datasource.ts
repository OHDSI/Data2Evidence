import pg from "pg";
import { DataSource, DataSourceOptions, LogLevel } from "typeorm";

import { env } from "../env.ts";
import { Canvas } from "../entities/canvas.ts";
import { Graph } from "../entities/graph.ts";

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

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: env.PG__HOST,
  port: env.PG__PORT,
  username: env.PG_ADMIN_USER,
  password: env.PG_ADMIN_PASSWORD,
  database: env.PG__DB_NAME,
  schema: env.PG_SCHEMA,
  ssl,
  logging: getLogLevels(),
  entities: [Canvas, Graph],
  synchronize: true,
};

const dataSource = new DataSource(dataSourceOptions);
dataSource.driver.supportedDataTypes.push("oid");
export default dataSource;
