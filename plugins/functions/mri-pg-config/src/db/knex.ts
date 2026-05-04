import Knex from 'knex'
import pg from 'pg'
import config from './knexfile'
const parseFn = (val: string) => {
  return val === null ? null : new Date(Date.parse(val + 'z'))
}
// 1114 represents type timestamp without timezone in pg
pg.types.setTypeParser(1114, parseFn)
export const db = Knex(config)
