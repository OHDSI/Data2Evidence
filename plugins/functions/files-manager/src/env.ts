import { object, z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().optional(),
  PG__HOST: z.string(),
  PG__DB_NAME: z.string(),
  PG_ADMIN_USER: z.string(),
  PG_ADMIN_PASSWORD: z.string(),
  PG_SCHEMA: z.string(),
  PG__SSL: z.string(),
  PG__CA_ROOT_CERT: z.string().optional(),
  PG__PORT: z
    .string()
    .refine((val) => !isNaN(parseInt(val)))
    .transform(Number),
});

const _env = Deno.env.toObject();
const result = Env.safeParse(_env);

let env = _env as unknown as z.infer<typeof Env>;

if (result.success) {
  env = result.data;
} else {
  console.error(`Failed to load Envs! ${JSON.stringify(result)}`);
  throw new Error(`Failed to load Envs! ${JSON.stringify(result)}`);
}
export { env };
