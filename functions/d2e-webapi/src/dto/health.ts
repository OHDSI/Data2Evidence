import { z } from "zod";

export const HealthResponseDto = z.object({
  uptime: z.number(),
  message: z.string().length(2),
  timestamp: z.number(),
});
