import * as dotenv from 'dotenv'
import { z } from 'zod'

if (Deno.env.has("DOTENV_PATH")) {
  dotenv.config({ path: Deno.env.get("DOTENV_PATH") })
}

const Env = z.object({
  PG__HOST: z.string(),
  PG__DB_NAME: z.string(),
  PG_USER: z.string(),
  PG_PASSWORD: z.string(),
  PG_SCHEMA: z.string(),
  PG__DIALECT: z.string(),
  NODE_ENV: z.string().optional(),
  PG__CA_ROOT_CERT: z.string().optional(),
  PG_ADMIN_USER: z.string().optional(),
  PG_ADMIN_PASSWORD: z.string().optional(),

  PG__PORT: z
    .string()
    .refine(val => !isNaN(parseInt(val)))
    .transform(Number),
  PG__MIN_POOL: z
    .string()
    .refine(val => !isNaN(parseInt(val)))
    .transform(Number),
  PG__MAX_POOL: z
    .string()
    .refine(val => !isNaN(parseInt(val)))
    .transform(Number),
  PG__IDLE_TIMEOUT_IN_MS: z
    .string()
    .refine(val => !isNaN(parseInt(val)))
    .transform(Number),

  PG__DEBUG: z.string().transform(val => val === '1' || /true/i.test(val)),
  sqlOnly: z
    .string()
    .transform(val => val === '1' || /true/i.test(val))
    .optional(),

  PG__SSL: z
    .string()
    .transform(val => val === '1' || /true/i.test(val))
    .optional(),

  TLS__INTERNAL__KEY: z.string().optional(),
  TLS__INTERNAL__CRT: z.string().optional(),
  TLS__INTERNAL__CA_CRT: z.string().optional(),
  SERVICE_ROUTES: z.string().transform((str, ctx): z.infer<ReturnType<typeof object>> => {
    try {
      return JSON.parse(str)
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })
      return z.never()
    }
  }),
})

let _env = Deno.env.toObject() 
_env.PG_SCHEMA =  _env.PG_SCHEMA || 'qe_config'


const result = Env.safeParse(_env)

let env = _env as unknown as z.infer<typeof Env>
if (result.success) {
  env = result.data;
} else {
  console.error(`Service Failed to Start!! ${JSON.stringify(result)}`);
  throw new Error(`Service Failed to Start!! ${JSON.stringify(result)}`)
}

export { env }
