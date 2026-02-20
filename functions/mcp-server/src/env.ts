import { object, z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, normalize, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

const _env = Object.assign({}, Deno.env.toObject());
const Env = z.object({
  SERVICE_ROUTES: z
    .string()
    .transform((str, ctx): z.infer<ReturnType<typeof object>> => {
      try {
        return JSON.parse(str);
      } catch (_e) {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.never();
      }
    }),
});
export const env = Env.parse(_env);

const PHENOTYPE_LIBRARY_BASE_PATH = join(__dirname, "..", "data").replace(
  /\/var\/tmp\/sb-compile-trex/,
  Deno.env.get("TREX_FUNCTION_PATH"),
);

export const PHENOTYPE_LIBRARY_COHORT_TEMPLATE = join(
  PHENOTYPE_LIBRARY_BASE_PATH,
  "cohorts",
);
export const PHENOTYPE_LIBRARY_COHORTS = join(
  PHENOTYPE_LIBRARY_BASE_PATH,
  "Cohorts.csv",
);
