//import * as dotenv from 'dotenv'
//dotenv.config({
//  path: process.env.DOTENV_PATH || undefined
//})

const _env = Deno.env.toObject()

export const env = {
    PG_SCHEMA: _env.PG_SCHEMA
}
