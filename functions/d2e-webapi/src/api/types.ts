import { z } from "zod";
import { CohortExpression } from "../types.ts";

export interface ICohortDefinitionSyntax {
  datasetId: string;
  expressionType: string;
  expression: z.infer<typeof CohortExpression>;
  tags: string[];
}
// Construct response into OMOP cohort definition format
export interface ICohortDefinition {
  name: string;
  description: string | null;
  syntax: ICohortDefinitionSyntax;
}

export interface IAnalyticsCohortDefinition {
  cohort_definition_id: number;
  cohort_definition_name: string;
  cohort_definition_description: string;
  definition_type_concept_id: number;
  cohort_definition_syntax: string;
  subject_concept_id: number;
  cohort_initiation_date: string;
}

export interface ICohortGeneratorFlowRun {
  datasetId: string;
  databaseCode: string;
  schemaName: string;
  vocabSchemaName: string;
  cohortJson: ICohortJsonType;
  description: string;
  cohortDefinitionId: number;
}

export interface ICohortJsonType {
  id: number;
  name: string;
  createdDate: number;
  modifiedDate: number;
  hasWriteAccess: boolean;
  tags: string[];
  expressionType: string;
  expression: z.infer<typeof CohortExpression>;
}
