import knex, { Knex } from "knex";
import pg from "pg";
import config from "./knexfile.ts";

const parseFn = (val: string) => {
  return val === null ? null : new Date(Date.parse(val + "z"));
};
// 1114 represents type timestamp without timezone in pg
pg.types.setTypeParser(1114, parseFn);

const k: Knex = knex(config);

k.client.validateConnection = (connection: any) => {
  if (connection.__knex__disposed) {
    console.info(`Connection error ${connection.__knex__disposed}`);
    return false;
  } else {
    return true;
  }
};

export { k };
