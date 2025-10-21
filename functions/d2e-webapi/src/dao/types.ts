import { z } from "zod";

export const WebapiConcept = z.object({
  CONCEPT_CLASS_ID: z.string(),
  CONCEPT_CODE: z.string(),
  CONCEPT_ID: z.number(),
  CONCEPT_NAME: z.string(),
  DOMAIN_ID: z.string(),
  INVALID_REASON: z.string(),
  STANDARD_CONCEPT: z.string(),
  VOCABULARY_ID: z.string(),
  VALID_START_DATE: z.string(),
  VALID_END_DATE: z.string(),
});
export type IWebapiConcept = z.infer<typeof WebapiConcept>;

export interface IAncestorsLookup {
  ancestor_id: number;
  descendant_id: number;
}

export interface IConceptRecommended {
  concept_id_1: number;
  concept_id_2: number;
  relationship_id: string;
}

export interface IConcept {
  concept_id: number;
  concept_name: string;
  domain_id: string;
  vocabulary_id: string;
  concept_class_id: string;
  standard_concept: string;
  concept_code: string;
  invalid_reason: string;
  valid_start_date?: string;
  valid_end_date?: string;
}

export interface IDomain {
  domain_id: string;
  domain_name: string;
  domain_concept_id: number;
}

export interface IVocabulary {
  vocabulary_id: string;
  vocabulary_name: string;
  vocabulary_reference: string;
  vocabulary_version: string;
  vocabulary_concept_id: number;
}

export interface IRelatedConceptsFromIdentifier {
  concept_id: number;
  concept_name: string;
  standard_concept: string;
  invalid_reason: string;
  concept_code: string;
  concept_class_id: string;
  domain_id: string;
  vocabulary_id: string;
  valid_start_date: string;
  valid_end_date: string;
  relationship_name: string;
  relationship_distance: number;
}

export interface IConceptRecordCount {
  CONCEPT_ID: number;
  RECORD_COUNT: number;
  DESCENDANT_RECORD_COUNT: number;
  PERSON_COUNT: number;
  DESCENDANT_PERSON_COUNT: number;
}
