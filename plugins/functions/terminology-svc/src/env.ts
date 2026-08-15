import { z } from "zod";

let env = {};

function initEnv(__env) {
  const _env = Object.assign({}, Deno.env.toObject(), __env);
  const envSchema = z.object({
    HANA_FTS_FUZZY: z.string().transform(Number),

    HANA_HYBRID_MODE: z.enum(["rerank", "union"]).default("rerank"),
    HANA_HYBRID_TOPK: z.string().transform(Number).default("1000"),

    TREX__SQL__HOST: z.string().optional(),
    TREX__SQL__PORT: z.string().optional(),
    TREX__SQL__USER: z.string().optional(),
    TREX__SQL__PASSWORD: z.string().optional(),
    TREX__SQL__DBNAME: z.string().optional(),

    PROJECT_NAME: z.string(),
  
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
      TREX_CURRENT_USER_FUNCTION_NAME: z.string().optional(),
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

  return env;
}

export { env, initEnv };
