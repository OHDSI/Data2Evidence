import { object, z } from "zod";

let env = {};
let services = {};

function initEnv(__env) {
  const _env = Object.assign({}, Deno.env.toObject(), __env);
  const Env = z.object({
    NODE_ENV: z.string().optional(),
    HANA__READ_ROLE: z.string().optional(),
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
  const result = Env.safeParse(_env);
  if (result.success) {
    env = result.data;
    services = env["SERVICE_ROUTES"];
    env["DATABASE_CREDENTIALS"] = _env["DATABASE_CREDENTIALS"];
    env["PG__TENANT_CONFIGS"] = _env["PG__TENANT_CONFIGS"];
    env["HANA__TENANT_CONFIGS"] = _env["HANA__TENANT_CONFIGS"];
    env["VCAP_SERVICES"] = _env["VCAP_SERVICES"];
    env["PG_USER"] = _env["PG_USER"];
    env["PG_PASSWORD"] = _env["PG_PASSWORD"];
    env["PG_HOST"] = _env["PG_HOST"];
    env["PG_PORT"] = _env["PG_PORT"];
    env["PG_DATABASE"] = _env["PG_DATABASE"];
  } else {
    console.error(`Service Failed to Start!! ${JSON.stringify(result)}`);
    throw new Error("ZOD parse failed");
  }
}

export { env, initEnv, services };
