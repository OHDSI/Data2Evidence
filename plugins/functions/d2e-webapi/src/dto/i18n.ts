import { z } from "zod";

export const LocalesResponseDto = z.array(
  z.object({
    code: z.string(),
    name: z.string(),
    default: z.boolean(),
  })
);

export const I18nLangResponseDto = z.unknown();
