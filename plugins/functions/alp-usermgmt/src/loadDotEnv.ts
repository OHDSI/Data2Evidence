import * as dotenv from 'dotenv'
dotenv.config({
  path: Deno.env.get('DOTENV_PATH') || undefined
})
