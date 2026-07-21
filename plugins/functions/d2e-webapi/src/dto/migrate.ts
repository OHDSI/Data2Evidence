import { z } from "zod";

export const CohortDefinitionMigrateResponseDto = z.object({
  successfulMigrations: z.number(),
  totalMigrations: z.number(),
});
export type ICohortDefinitionMigrateResponseDto = z.infer<
  typeof CohortDefinitionMigrateResponseDto
>;
