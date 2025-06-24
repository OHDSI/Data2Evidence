import { z } from "zod";

export const Concept = z.object({
  CONCEPT_CLASS_ID: z.string(),
  CONCEPT_CODE: z.string(),
  CONCEPT_ID: z.number(),
  CONCEPT_NAME: z.string(),
  DOMAIN_ID: z.string(),
  INVALID_REASON: z.string().nullable(),
  INVALID_REASON_CAPTION: z.string(),
  STANDARD_CONCEPT: z.string().nullable(),
  STANDARD_CONCEPT_CAPTION: z.string(),
  VOCABULARY_ID: z.string(),
  VALID_START_DATE: z.union([z.string(), z.number()]), // Value is either unix timestamp(1737622162) or date string("2002-01-31")
  VALID_END_DATE: z.union([z.string(), z.number()]), // Value is either unix timestamp(1737622162) or date string("2002-01-31")
});
export type IConcept = z.infer<typeof Concept>;

export const ConceptSetExpression = z.object({
  concept: Concept,
  isExcluded: z.boolean(),
  includeDescendants: z.boolean(),
  includeMapped: z.boolean(),
});

// TODO: ADD TYPE
export const CohortExpression = z.record(z.string(), z.unknown());
// TODO: ADD TYPE
export const CohortExpressionQueryOptions = z.unknown();

export const ConceptRecommended = Concept.omit({
  VALID_START_DATE: true,
  VALID_END_DATE: true,
}).extend({
  RELATIONSHIPS: z.array(z.string()),
});

export const ConceptRelated = Concept.extend({
  RELATIONSHIPS: z.array(
    z.object({
      RELATIONSHIP_NAME: z.string(),
      RELATIONSHIP_DISTANCE: z.number(),
    })
  ),
  RELATIONSHIP_CAPTION: z.string(),
});

export enum UserArtifactServiceNames {
  CONCEPT_SETS = "concept_sets",
  ATLAS_COHORT_DEFINITIONS = "atlas_cohort_definitions",
}
