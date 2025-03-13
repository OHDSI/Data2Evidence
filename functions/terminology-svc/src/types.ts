import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
export type ConceptSet = {
  id: number;
  name: string;
  shared: boolean;
  concepts: ConceptSetConcept[];
  createdBy: string;
  createdDate: Date;
  modifiedBy: string;
  modifiedDate: Date;
  userName: string;
};

export type ConceptSetConcept = {
  id: number;
  useDescendants: boolean;
  useMapped: boolean;
};
export interface IConcept {
  concept_id: number;
  concept_name: string;
  domain_id: string;
  vocabulary_id: string;
  concept_class_id: string;
  standard_concept: string;
  concept_code: string;
  invalid_reason: string;
  valid_start_date?: number;
  valid_end_date?: number;
  score?: number;
}

export interface IHanaConcept {
  CONCEPT_ID: string;
  CONCEPT_NAME: string;
  DOMAIN_ID: string;
  VOCABULARY_ID: string;
  CONCEPT_CLASS_ID: string;
  STANDARD_CONCEPT: string;
  CONCEPT_CODE: string;
  INVALID_REASON: string | null;
  VALID_START_DATE: string;
  VALID_END_DATE: string;
  system_valid_from: boolean;
  system_valid_until: boolean;
}

export const IDuckdbFacetSchema = z.object({
  conceptClassId: z.record(z.number()),
  domainId: z.record(z.number()),
  standardConcept: z.record(z.number()),
  vocabularyId: z.record(z.number()),
  validity: z.record(z.number()),
  concept: z.record(z.number()),
});
export type IDuckdbFacet = z.infer<typeof IDuckdbFacetSchema>;

export interface IDuckdbConcept {
  hits: IConcept[];
  totalHits: number;
}

export interface IConceptAncestor {
  ancestor_concept_id: number;
  descendant_concept_id: number;
  min_levels_of_separation: number;
  max_levels_of_separation: number;
}

export interface IHanaConceptAncestor {
  ANCESTOR_CONCEPT_ID: string;
  DESCENDANT_CONCEPT_ID: string;
  MIN_LEVELS_OF_SEPARATION: string;
  MAX_LEVELS_OF_SEPARATION: string;
}

export interface IConceptRelationship {
  concept_id_1: number;
  concept_id_2: number;
  relationship_id: string;
  valid_start_date: number;
  valid_end_date: number;
  invalid_reason: string | null;
}

export interface IHanaConceptRelationship {
  CONCEPT_ID_1: string;
  CONCEPT_ID_2: string;
  RELATIONSHIP_ID: string;
  VALID_START_DATE: string;
  VALID_END_DATE: string;
  INVALID_REASON: string | null;
}

export interface IConceptRecommended {
  concept_id_1: number;
  concept_id_2: number;
  relationship_id: string;
}

export interface IHanaConceptRecommended {
  CONCEPT_ID_1: string;
  CONCEPT_ID_2: string;
  RELATIONSHIP_ID: string;
}

export interface FhirValueSet {
  resourceType: string;
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status?: string;
  experimental?: string;
  date?: string;
  publisher?: string;
  contact?: string;
  description?: string;
  useContext?: string;
  jurisdiction?: string;
  immutable?: string;
  purpose?: string;
  copyright?: string;
  copyrightLabel?: string;
  approvalDate?: string;
  lastReviewDate?: string;
  effectivePeriod?: string;
  topic?: string;
  author?: string;
  editor?: string;
  reviewer?: string;
  endorser?: string;
  relatedArtifact?: string;
  compose?: string;
  expansion: FhirValueSetExpansion;
  scope?: string;
}

export type FhirValueSetExpansion = {
  id?: string;
  extension?: string;
  timestamp: Date;
  total: number;
  offset: number;
  parameter?: string;
  property?: string;
  contains?: FhirValueSetExpansionContainsWithExt[];
};

export type FhirValueSetExpansionContainsWithExt = {
  id?: number;
  extension?: string;
  abstract?: string;
  inactive?: string;
  version?: string;
  designation?: string;
  contains?: FhirValueSetExpansionContainsWithExt[];
  code: string;
  display: string;
  system: string;
  conceptId: number;
  domainId: string;
  conceptClassId: string;
  standardConcept: string;
  concept: string;
  validStartDate: string;
  validEndDate: string;
  validity: string;
  score?: number;
};

export const FhirResourceType = {
  valueset: "ValueSet",
  conceptmap: "ConceptMap",
} as const;

export type FhirConceptMapElementTarget = {
  code: number;
  display: string;
  equivalence: string;
  vocabularyId: string;
};
export type FhirConceptMapElementWithExt = {
  code: string;
  display: string;
  valueSet: FhirValueSet;
  target: FhirConceptMapElementTarget[];
};

export type FhirConceptMapGroup = {
  source: string;
  target: string;
  element: FhirConceptMapElementWithExt[];
};

export type FhirConceptMap = {
  resourceType: string;
  group: FhirConceptMapGroup[];
};

export type Filters = {
  conceptClassId: string[];
  domainId: string[];
  standardConcept: string[];
  vocabularyId: string[];
  validity: ("Valid" | "Invalid")[];
};

export type ConceptHierarchyEdge = {
  source: number;
  target: number;
};

export type ConceptHierarchyNodeLevel = {
  conceptId: number;
  level: number;
};

export type ConceptHierarchyNode = ConceptHierarchyNodeLevel & {
  display: string;
};

export enum DatasetDialects {
  HANA = "hana",
  POSTGRES = "postgres",
  DUCKDB = "duckdb",
}
