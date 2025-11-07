import { object, z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().optional(),
  CACHEDB__HOST: z.string(),
  CACHEDB__PORT: z
    .string()
    .refine((val) => !isNaN(parseInt(val)))
    .transform(Number),
  SERVICE_ROUTES: z
    .string()
    .transform((str, ctx): z.infer<ReturnType<typeof object>> => {
      try {
        return JSON.parse(str);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.never();
      }
    }),
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
