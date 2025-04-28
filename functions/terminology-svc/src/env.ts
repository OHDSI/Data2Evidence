import { z } from "zod";

let env = {};

function initEnv(__env) {
  const _env = Object.assign({}, Deno.env.toObject(), __env);
  const envSchema = z.object({
    CACHEDB__HOST: z.string(),
    CACHEDB__PORT: z.string().transform(Number),

    USE_HANA_JWT_AUTHC: z.string(),

    HANA_FTS_FUZZY: z.string().transform(Number),

    SERVICE_ROUTES: z
      .string()
      .transform((str, ctx): { [key: string]: string } => {
        try {
          return JSON.parse(str);
        } catch (e) {
          ctx.addIssue({ code: "custom", message: "Invalid JSON" });
          throw e;
        }
      }),
  });

  const { success, data, error } = envSchema.safeParse(_env);

  if (!success) {
    console.error(error);
    Deno.exit(1);
  }
  env = data;
  env["DATABASE_CREDENTIALS"] = _env["DATABASE_CREDENTIALS"];
  env["PG__TENANT_CONFIGS"] = _env["PG__TENANT_CONFIGS"];
  env["HANA__TENANT_CONFIGS"] = _env["HANA__TENANT_CONFIGS"];
  env["VCAP_SERVICES"] = _env["VCAP_SERVICES"];
  env["useBrowserCache"] = false;
  env["allowLocalModels"] = false;

  return env;
}

export { env, initEnv };
