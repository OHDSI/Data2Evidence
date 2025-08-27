import * as dotenv from 'dotenv'
import { z } from 'zod'

if (Deno.env.has("DOTENV_PATH")) {
  dotenv.config({ path: Deno.env.get("DOTENV_PATH") })
}

const Env = z.object({
  // FHIR Server configuration
  FHIR__PORT: z.number().min(1).default(8103),
  FHIR__LOG_LEVEL: z.string().default('DEBUG'),

  // Binary upload limits
  BINARY_UPLOAD_LIMIT_SIZE: z.number().min(0).default(1000000000),

  // Database configuration
  PG__HOST: z.string().default('localhost'),
  PG__PORT: z.number().min(1).default(5432),
  PG__DB_NAME: z.string().default('medplum'),
  PG__SUPER_USER: z.string().default('postgres'),
  PG__SUPER_PASSWORD: z.string().default('postgres'),
  PG__CA_ROOT_CERT: z.string().optional(),
  PG__SSL: z.boolean().default(false),

  // Custom FHIR Schema
  FHIR_CUSTOM_SCHEMA: z.string().default("fhir"),

  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.number().min(1).default(6379),
  REDIS_PASSWORD: z.string().default(''),

  // Node.js compatibility
  NODE_ENV: z.string().default('production'),
  // SSL/TLS configuration
  TLS__INTERNAL__KEY: z.string().optional(),
  TLS__INTERNAL__CRT: z.string().optional(),
  TLS__INTERNAL__CA_CRT: z.string().optional(),
  // System configuration
  ALP__SYSTEM_NAME: z.string().optional(),
  APP__TENANT_ID: z.string().optional(),

  // Identity Provider configuration
  IDP__BASE_URL: z.string().optional(),
  IDP__RELYING_PARTY: z.string().optional(),
  IDP__FETCH_USER_INFO_TYPE: z.string().optional(),

  // Service routes
  SERVICE_ROUTES: z.string().transform((str, ctx): z.infer<ReturnType<typeof object>> => {
    try {
      return JSON.parse(str)
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })
      return z.never()
    }
  })
})

let _env = Deno.env.toObject() 
const result = Env.safeParse(_env)

let env = _env as unknown as z.infer<typeof Env>
if (result.success) {
  env = result.data;
} else {
  console.error(`Service Failed to Start!! ${JSON.stringify(result)}`);
  throw new Error(`Service Failed to Start!! ${JSON.stringify(result)}`)
}

export { env }