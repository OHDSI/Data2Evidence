import { object, z } from "zod";

let env = {}; 

function initEnv(__env) {
    const _env = Object.assign({}, Deno.env.toObject(), __env)
    const Env = z.object({
        ALP_GATEWAY_OAUTH__URL: z.string(),
        ALP__SYSTEM_ID: z.string(),
        ANALYTICS_SVC__DEFAULT_ASSIGNMENT_NAME: z.string(),
        ANALYTICS_SVC__PORT: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),
        ANALYTICS_SVC__STUDIES_METADATA__TTL_IN_SECONDS: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),
        DUCKDB__DATA_FOLDER: z.string(),
        IDP__ALP_SVC__CLIENT_ID: z.string(),
        IDP__ALP_SVC__CLIENT_SECRET: z.string(),
        USE_EXTENSION_FOR_COHORT_CREATION: z.string(),

        USE_DUCKDB: z.string(),
        USE_CACHEDB: z.string(),
        USE_HANA_JWT_AUTHC: z.string(),

        PG__IDLE_TIMEOUT_IN_MS: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),
        PG__MAX_POOL: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),
        PG__MIN_POOL: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),

        CACHEDB__HOST: z.string(),
        CACHEDB__PORT: z
            .string()
            .refine((val) => !isNaN(parseInt(val)))
            .transform(Number),

        LOCAL_DEBUG: z.string(),
        SQL_RETURN_ON: z.string(),
        isHttpTestRun: z.string().optional(),
        isTestEnv: z.string().optional(),
        TESTSCHEMA: z.string().optional(),
        local: z.string(),

        TLS__INTERNAL__KEY: z.string().optional(),
        TLS__INTERNAL__CRT: z.string().optional(),
        TLS__INTERNAL__CA_CRT: z.string().optional(),
        NODE_ENV: z.string().optional(),
        ENV_MOUNT_PATH: z.string().optional(),
        TESTSCHEMA: z.string().optional(),
        //DATABASE_CREDENTIALS: z.array().optional(),
        MINIO__ENDPOINT: z.string().optional(),
        MINIO__PORT: z
        .string()
        .refine((val) => !isNaN(parseInt(val)))
        .transform(Number),
        MINIO__SSL: z.string(),
        MINIO__ACCESS_KEY: z.string(),
        MINIO__SECRET_KEY: z.string(),
        MINIO__REGION: z.string(),
        DB_SVC__LOG_LEVEL: z.string().optional(),
        INTEGRATION_TEST__HANA__TENANT_CONFIGS: z.string().optional(),
        PG__READ_ROLE: z.string().optional(),
        ANALYTICS_PATIENT_LIST_BATCH_SIZE: z.string(),
       // PG__TENANT_CONFIGS: z.string().optional(),
        HANA__READ_ROLE: z.string().optional(),
        //HANA__TENANT_CONFIGS: z.string().optional(),
        DB_SVC__IDP_SUBJECT_PROP: z.string().optional(),
        DB_SVC__PATH: z.string().optional(),
        DB_SVC__PORT: z.string().optional(),
        IS_AUDIT_LOG_ENABLED: z.string().optional(),
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
        }).superRefine(({ LOCAL_DEBUG, isHttpTestRun, isTestEnv, TESTSCHEMA }, refinementContext) => {
            //Validate for non-prod scenarios
            if (LOCAL_DEBUG.toLowerCase() === "true") {
                const addError = (env) => {
                    refinementContext.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `No value for ${env}`,
                        path: [env],
                      });
                }
         
                if (!isHttpTestRun) addError("isHttpTestRun")
                if (!isTestEnv) addError("isTestEnv")
                if (!TESTSCHEMA && (isTestEnv && isTestEnv.toLowerCase() === "true")) addError("TESTSCHEMA");
            }
    });

    const result =  Env.safeParse(_env);
    env = _env as unknown as z.infer<typeof Env>;
    if (result.success) {
        env = result.data;
        env['DATABASE_CREDENTIALS'] = _env['DATABASE_CREDENTIALS'];
        env['PG__TENANT_CONFIGS'] = _env['PG__TENANT_CONFIGS'];
        env['HANA__TENANT_CONFIGS'] = _env['HANA__TENANT_CONFIGS'];
        env['VCAP_SERVICES'] = _env['VCAP_SERVICES'];

    } else {
        console.error(`Service Failed to Start!! ${JSON.stringify(result)}`);
        throw new Error("ZOD parse failed")
    }
    return env;
    
}


export { env, initEnv };
