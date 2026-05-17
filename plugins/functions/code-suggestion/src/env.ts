import { object, z } from "zod";

const _env = Object.assign({}, Deno.env.toObject());

// Treat unset, empty string, and the literal string "null" (produced by
// `${VAR:-null}` templating in plugins/functions/package.json) as undefined,
// so downstream code can use plain `!env.X` / `env.X === undefined` checks.
const optionalSecret = z
  .string()
  .optional()
  .transform((v) => (v && v !== "null" ? v : undefined));

const Env = z.object({
  SERVICE_ROUTES: z
    .string()
    .optional()
    .transform(
      (
        str: string | undefined,
        ctx: any,
      ): z.infer<ReturnType<typeof object>> | undefined => {
        if (!str) return undefined;
        try {
          return JSON.parse(str);
        } catch (_e) {
          ctx.addIssue({ code: "custom", message: "Invalid JSON" });
          return z.NEVER;
        }
      },
    ),
  AI_MODEL: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  AZURE_OPENAI_API_KEY: optionalSecret,
  AZURE_OPENAI_API_VERSION: optionalSecret,
  AZURE_OPENAI_API_INSTANCE_NAME: optionalSecret,
  AZURE_OPENAI_API_DEPLOYMENT_NAME: optionalSecret,
  ANTHROPIC_API_KEY: optionalSecret,
  GOOGLE_API_KEY: optionalSecret,
  OLLAMA_BASE_URL: optionalSecret,
  OLLAMA_API_KEY: optionalSecret,
});

export const env = Env.parse(_env);
