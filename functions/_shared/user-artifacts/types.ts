import { z } from "zod";
import { CohortExpression } from "../../d2e-webapi/src/types.ts";

export const MaterializedBookmarkCohortDefinition = z.object({
  datasetId: z.string(),
  cohortDefinitionId: z.number(),
});
export type IMaterializedBookmarkCohortDefinition = z.infer<
  typeof MaterializedBookmarkCohortDefinition
>;

export const BookmarkArtifact = z.object({
  id: z.string(),
  type: z.string().nullable(),
  shared: z.boolean(),
  user_id: z.string(),
  version: z.number(),
  bookmark: z.string(),
  modified: z.string(),
  view_name: z.string().nullable(),
  pa_config_id: z.string(),
  bookmark_name: z.string(),
  cdm_config_id: z.string(),
  cdm_config_version: z.string(),
  materializedCohortDefinitions: z
    .array(MaterializedBookmarkCohortDefinition)
    .optional(),
});
export type IBookmarkArtifact = z.infer<typeof BookmarkArtifact>;

export const AtlasCohortDefinitionArtifact = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  expressionType: z.string(),
  expression: CohortExpression,
  createdBy: z.string().nullable(), // Atlas usernames are numbers, but string for d2e
  createdDate: z.number().nullable(),
  modifiedBy: z.string().nullable(), // Atlas usernames are numbers, but string for d2e
  modifiedDate: z.number().nullable(),
  tags: z.array(z.string()),
  materializedCohortDefinitions: z.array(MaterializedBookmarkCohortDefinition),
});
export type IAtlasCohortDefinitionArtifact = z.infer<
  typeof AtlasCohortDefinitionArtifact
>;

export const ConceptSetConcept = z.object({
  id: z.number(),
  useMapped: z.boolean(),
  isExcluded: z.boolean(),
  useDescendants: z.boolean(),
});
export type IConceptSetConcept = z.infer<typeof ConceptSetConcept>;

export const ConceptSetArtifact = z.object({
  id: z.number(),
  name: z.string(),
  shared: z.boolean(),
  concepts: z.array(ConceptSetConcept),
  userName: z.string(),
  createdBy: z.string(),
  modifiedBy: z.string(),
  createdDate: z.string(),
  modifiedDate: z.string(),
});

export const NotebookArtifact = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  isShared: z.boolean(),
  createdBy: z.string(),
  datasetId: z.string().optional(),
  modifiedBy: z.string(),
  notebookContent: z.string(),
});
export type INotebookArtifact = z.infer<typeof NotebookArtifact>;

export const AnalysisFlowArtifact = z.object({
  options: z.object({
    mode: z.string(),
    datasetId: z.string(),
    schemaName: z.string(),
    databaseCode: z.string(),
  }),
  json_graph: z.object({
    executionSettings: z.string(),
    analysisSpecification: z.string(),
  }),
});
export type IAnalysisFlowArtifact = z.infer<typeof AnalysisFlowArtifact>;

// prettier-ignore
export const UserArtifact = BookmarkArtifact
                            .or(AtlasCohortDefinitionArtifact)
                            .or(ConceptSetArtifact)
                            .or(NotebookArtifact)
                            .or(AnalysisFlowArtifact);
export type IUserArtifact = z.infer<typeof UserArtifact>;
