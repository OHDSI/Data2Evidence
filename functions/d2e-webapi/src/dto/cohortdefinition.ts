import { z } from "zod";
import { CohortExpression, CohortExpressionQueryOptions } from "../types.ts";

export const CohortDefinitionDto = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  expressionType: z.string(),
  expression: CohortExpression,
  createdBy: z.number().nullable(),
  createdDate: z.number(),
  modifiedBy: z.number().nullable(),
  modifiedDate: z.number().nullable(),
  tags: z.array(z.string()),
});

export const CohortDefinitionResponseDto = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    createdDate: z.number(),
    hasWriteAccess: z.boolean(),
    hasReadAccess: z.boolean(),
    tags: z.array(z.string()),
  })
);

export const CohortDefinitionCreateResponseDto = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  expressionType: z.string(),
  expression: CohortExpression,
  createdDate: z.number(),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
});

export const CohortDefinitionCopyResponseDto =
  CohortDefinitionCreateResponseDto.omit({ description: true });

export const CohortDefinitionPutResponseDto =
  CohortDefinitionCreateResponseDto.omit({ description: true }).extend({
    modifiedDate: z.number(),
    tags: z.array(z.string()),
  });

export const CohortDefinitionSqlDto = z.object({
  expression: CohortExpression,
  options: CohortExpressionQueryOptions,
});

export const CohortDefinitionSqlResponseDto = z.object({
  tempplateSql: z.string(),
});

export const CohortDefinitionIdVersionResponseDto = z.array(
  z.object({
    assetId: z.number(),
    version: z.number(),
    archived: z.boolean(),
    createdDate: z.number(),
  })
);

export const CohortDefinitionIdInfoResponseDto = z.array(
  z.object({
    id: z.object({ cohortDefinitionId: z.number(), sourceId: z.number() }),
    startTime: z.number(),
    executionDuration: z.number(),
    status: z.string(),
    isValid: z.boolean(),
    isCanceled: z.boolean(),
    failMessage: z.string().nullable(),
    personCount: z.number().nullable(),
    recordCount: z.number().nullable(),
    createdBy: z.string().nullable(),
  })
);

export const CohortDefinitionCheckV2ResponseDto = z.object({
  warnings: z.array(
    z.object({
      type: z.string(),
      severity: z.string(),
      message: z.string(),
      conceptSetId: z.number().optional(),
    })
  ),
});

export const GenerateCohortResponseDto = z.object({
  status: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  exitStatus: z.string(),
  executionId: z.string(),
  jobInstance: z.object({
    instanceId: z.string(),
    name: z.string(),
  }),
  jobParameters: z.object({
    jobName: z.string(),
    generate_stats: z.string(),
    jobAuthor: z.string(),
    sessionId: z.string(),
    cohort_definition_id: z.number(),
    source_id: z.string(),
    time: z.number(),
    target_database_schema: z.string(),
  }),
  ownerType: z.string().nullable(),
});
