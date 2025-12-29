import { object, z } from "zod";

const _env = Object.assign({}, Deno.env.toObject());
const Env = z.object({
  SERVICE_ROUTES: z
    .string()
    .optional()
    .transform(
      (
        str: string | undefined,
        ctx: any
      ): z.infer<ReturnType<typeof object>> | undefined => {
        if (!str) return undefined;
        try {
          return JSON.parse(str);
        } catch (_e) {
          ctx.addIssue({ code: "custom", message: "Invalid JSON" });
          return z.NEVER;
        }
      }
    ),
  AI_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().optional(),
  AZURE_OPENAI_API_INSTANCE_NAME: z.string().optional(),
  AZURE_OPENAI_API_DEPLOYMENT_NAME: z.string().optional(),
  MCP_AUTH_TOKEN: z.string().optional(),
  MCP_DATASET_ID: z.string().optional(),
});

export const env = Env.parse(_env);
