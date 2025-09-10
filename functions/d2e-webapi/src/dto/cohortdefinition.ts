import { z } from "zod";
import { CohortExpressionQueryOptions, CohortExpression } from "../types.ts";
import { AtlasCohortDefinitionArtifact } from "../../../_shared/user-artifacts/types.ts";
import { BookmarksSchema } from "../api/types.ts";

export const AtlasCohortDefinitionDto = AtlasCohortDefinitionArtifact.omit({
  materializedCohortDefinitions: true,
});
export type IAtlasCohortDefinitionDto = z.infer<
  typeof AtlasCohortDefinitionDto
>;

export const UserArtifactAtlasCohortDefinitionDto =
  AtlasCohortDefinitionArtifact;
export type IUserArtifactAtlasCohortDefinitionDto = z.infer<
  typeof UserArtifactAtlasCohortDefinitionDto
>;

export const CohortDefinitionListResponseDto = BookmarksSchema;
export type ICohortDefinitionListResponseDto = z.infer<
  typeof CohortDefinitionListResponseDto
>;

export const CohortDefinitionResponseDto = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  expressionType: z.string(),
  expression: CohortExpression,
  createdBy: z.string().nullable().optional(),
  createdDate: z.number().nullable(),
  modifiedBy: z.string().nullable().optional(),
  modifiedDate: z.number().nullable(),
  tags: z.array(z.string()),
  hasWriteAccess: z.boolean(),
  hasReadAccess: z.boolean(),
});

export const CohortDefinitionCreateResponseDto =
  CohortDefinitionResponseDto.omit({ modifiedDate: true, tags: true });

export const CohortDefinitionCopyResponseDto =
  CohortDefinitionCreateResponseDto.omit({ description: true });

export const CohortDefinitionSqlDto = z.object({
  expression: CohortExpression,
  options: CohortExpressionQueryOptions,
});

export const CohortDefinitionSqlResponseDto = z.object({
  templateSql: z.string(),
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
export type ICohortDefinitionIdInfoResponseDto = z.infer<
  typeof CohortDefinitionIdInfoResponseDto
>;

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
export type ICohortDefinitionCheckV2ResponseDto = z.infer<
  typeof CohortDefinitionCheckV2ResponseDto
>;

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
export type IGenerateCohortResponseDto = z.infer<
  typeof GenerateCohortResponseDto
>;
