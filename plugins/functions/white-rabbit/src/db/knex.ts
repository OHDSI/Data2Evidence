import knex from "knex";
import pg from "pg";
import { createLogger } from "../Logger.ts";
import config from "./knexfile.ts";

const logger = createLogger("Knex");

const parseFn = (val: string) => {
  return val === null ? null : new Date(Date.parse(val + "z"));
};
// 1114 represents type timestamp without timezone in pg
pg.types.setTypeParser(1114, parseFn);

const db = knex(config);

db.client.validateConnection = (connection: any) => {
  if (connection.__knex__disposed) {
    logger.info(`Connection error ${connection.__knex__disposed}`);
    return false;
  } else {
    return true;
  }
};

export { db };
