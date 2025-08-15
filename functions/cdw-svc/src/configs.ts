import { z } from "zod";
import { EnvVarUtils, Logger } from "@alp/alp-base-utils";

const log = Logger.CreateLogger("cdw-svc: Loading of environment variables");

const Env = z
  .object({
    NODE_ENV: z.string(),
    ENV_MOUNT_PATH: z.string().optional(),
    PORT: z.string(),
    MRI_USER: z.string().optional(),

    TLS__INTERNAL__KEY: z.string().optional(),
    TLS__INTERNAL__CRT: z.string().optional(),

    LOCAL_DEBUG: z.string(),
    isHttpTestRun: z.string().optional(),
    isTestEnv: z.string().optional(),
    TESTSCHEMA: z.string().optional(),

    PG__SSL: z.string(),
    PG__CA_ROOT_CERT: z.string().optional(),
    PG__HOST: z.string(),
    PG__DB_NAME: z.string(),
    PG_USER: z.string(),
    PG_PASSWORD: z.string(),
    PG_SCHEMA: z.string(),
    PG__DIALECT: z.string(),
    PG__PORT: z
      .string()
      .refine((val) => !isNaN(parseInt(val)))
      .transform(Number),
    PG__MIN_POOL: z
      .string()
      .refine((val) => !isNaN(parseInt(val)))
      .transform(Number),
    PG__MAX_POOL: z
      .string()
      .refine((val) => !isNaN(parseInt(val)))
      .transform(Number),
    PG__IDLE_TIMEOUT_IN_MS: z
      .string()
      .refine((val) => !isNaN(parseInt(val)))
      .transform(Number),
    VCAP_SERVICES: z.unknown(),
    SERVICE_ROUTES: z
      .string()
      .transform((str, ctx): z.infer<ReturnType<typeof Object>> => {
        try {
          return JSON.parse(str);
        } catch (e) {
          ctx.addIssue({ code: "custom", message: "Invalid JSON" });
          return z.never();
        }
      }),
  })
  .superRefine(
    (
      { LOCAL_DEBUG, isHttpTestRun, isTestEnv, TESTSCHEMA },
      refinementContext
    ) => {
      //Validate for non-prod scenarios
      if (LOCAL_DEBUG.toLowerCase() === "true") {
        const addError = (envVariable) => {
          refinementContext.addIssue({
            code: z.ZodIssueCode.custom,
            message: `No value for ${envVariable}`,
            path: [envVariable],
          });
        };

        if (!isHttpTestRun) addError("isHttpTestRun");
        if (!isTestEnv) addError("isTestEnv");
        if (!TESTSCHEMA && isTestEnv && isTestEnv.toLowerCase() === "true")
          addError("TESTSCHEMA");
      }
    }
  );

let env = {} as unknown as z.infer<typeof Env>;
const envVarUtils = new EnvVarUtils(env);

function initEnv(__env) {
  const _env = Object.assign({}, Deno.env.toObject(), __env);
  _env.PG_SCHEMA = _env.PG_SCHEMA || "cdw_config";

  const result = Env.safeParse(_env);
  env = _env as unknown as z.infer<typeof Env>;
  if (result.success) {
    env = result.data;
  } else {
    console.error(`Service Failed to Start!! ${JSON.stringify(result)}`);
    throw new Error("ZOD parse failed");
  }

  return env;
}

export { env, envVarUtils, initEnv };
