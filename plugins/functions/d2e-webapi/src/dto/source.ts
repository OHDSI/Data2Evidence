import { z } from "zod";

export const SourceDaimon = z.array(
  z.object({
    sourceDaimonId: z.number(), // Unused
    daimonType: z.string(), // CDM|Vocabulary|Results|CEM|CEMResults|...
    tableQualifier: z.string(), // Schema
    priority: z.number(), // Unused
  })
);

export const SourceDto = z.object({
  sourceId: z.number(), // Unused
  sourceName: z.string(), // Dataset name
  sourceDialect: z.string(),
  sourceKey: z.string(), // DatasetId
  daimons: SourceDaimon,
});
export type ISourceDto = z.infer<typeof SourceDto>;
export const SourcesResponseDto = z.array(SourceDto);

export const DaimonPriorityResponseDto = z.record(z.string(), SourceDto);
export type IDaimonPriorityResponseDto = z.infer<
  typeof DaimonPriorityResponseDto
>;
