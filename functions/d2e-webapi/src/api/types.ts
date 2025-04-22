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
  description: string | null;
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

export interface IResolveConceptSetExpressionConcept {
  id: number;
  useMapped: boolean;
  useDescendants: boolean;
  isExcluded: boolean;
}

export interface ITerminologyConceptSetConcept {
  id: number;
  useMapped: boolean;
  useDescendants: boolean;
  isExcluded: boolean;
}

export interface ITerminologyConceptSetConceptWithConceptData {
  conceptId: number;
  display: string;
  domainId: string;
  system: string;
  conceptClassId: string;
  standardConcept: string;
  concept: string;
  code: string;
  validStartDate: string;
  validEndDate: string;
  validity: string;
  id: number;
  useMapped: boolean;
  useDescendants: boolean;
  isExcluded: boolean;
  conceptCode: string;
  conceptName: string;
  vocabularyId: string;
}

export interface ITerminologyConceptSetWithConceptData {
  id: number;
  name: string;
  shared: boolean;
  concepts: ITerminologyConceptSetConceptWithConceptData[];
  userName: string;
  createdBy: string;
  modifiedBy: string;
  createdDate: string;
  modifiedDate: string;
}

export interface ITerminologyConceptSet {
  id: number;
  name: string;
  shared: boolean;
  concepts: ITerminologyConceptSetConcept[];
  userName: string;
  createdBy: string;
  modifiedBy: string;
  createdDate: string;
  modifiedDate: string;
}

export interface ITerminologyFhirConcept {
  conceptId: number;
  display: string;
  domainId: string;
  system: string;
  conceptClassId: string;
  standardConcept: string;
  concept: string;
  code: string;
  validStartDate: string;
  validEndDate: string;
  validity: string;
}
export interface ITerminologyFhirResource {
  resourceType: string;
  expansion: {
    total: number;
    offset: number;
    timestamp: string;
    contains: ITerminologyFhirConcept[];
  };
}

export interface ITerminologyConcept {
  concept_id: number;
  concept_name: string;
  domain_id: string;
  vocabulary_id: string;
  concept_class_id: string;
  standard_concept: string;
  concept_code: string;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason: string | null;
}

export interface ITerminologyCreateConceptSet {
  concepts: ITerminologyConceptSetConcept[];
  name: string;
  shared: boolean;
  userName: string;
}

export interface PortalUserArtifacts {
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  userId: string;
  artifacts: unknown;
}

export interface IUserMe {
  id: string;
  username: string;
}
