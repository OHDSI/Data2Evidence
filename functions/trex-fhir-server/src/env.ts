import { object, z } from "zod";

const _env = Object.assign({}, Deno.env.toObject());
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
});

export const env = Env.parse(_env);
