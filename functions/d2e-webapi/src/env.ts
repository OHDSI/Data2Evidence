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
});

export const env = Env.parse(_env);
