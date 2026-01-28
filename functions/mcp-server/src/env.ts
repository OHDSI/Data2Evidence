import { object, z } from "zod";

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
  CACHEDB__HOST: z.string(),
  CACHEDB__PORT: z.string().transform(Number),
});

export const env = Env.parse(_env);

export const PHENOTYPE_LIBRARY_COHORT_TEMPLATE =
  "https://raw.githubusercontent.com/data2evidence/d2e-PhenotypeLibrary/main/inst/cohorts";

export const PHENOTYPE_LIBRARY_COHORTS =
  "/usr/src/plugins/d2ef/mcp-server/data/phenotypes/Cohorts.csv";
