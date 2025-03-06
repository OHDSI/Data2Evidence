import { z } from "zod";

export const SourceDaimon = z.array(
  z.object({
    sourceDaimonId: z.number(),
    daimonType: z.string(),
    tableQualifier: z.string(),
    priority: z.number(),
  })
);

export const SourcesResponseDto = z.array(
  z.object({
    sourceId: z.number(),
    sourceName: z.string(),
    sourceDialect: z.string(),
    sourceKey: z.string(),
    daimons: SourceDaimon,
  })
);

export const DaimonPriorityResponseDto = z.record(
  z.unknown(),
  SourcesResponseDto
);
