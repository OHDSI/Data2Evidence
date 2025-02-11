import { z } from "zod";

export const Concept = z.object({
  CONCEPT_CLASS_ID: z.string(),
  CONCEPT_CODE: z.string(),
  CONCEPT_ID: z.number(),
  CONCEPT_NAME: z.string(),
  DOMAIN_ID: z.string(),
  INVALID_REASON: z.string(),
  INVALID_REASON_CAPTION: z.string(),
  STANDARD_CONCEPT: z.string(),
  STANDARD_CONCEPT_CAPTION: z.string(),
  VOCABULARY_ID: z.string(),
  VALID_START_DATE: z.union([z.string(), z.number()]), // Value is either unix timestamp(1737622162) or date string("2002-01-31")
  VALID_END_DATE: z.union([z.string(), z.number()]), // Value is either unix timestamp(1737622162) or date string("2002-01-31")
});

export const ConceptSetExpression = z.object({
  concept: Concept,
  isExcluded: z.boolean(),
  includeDescendants: z.boolean(),
  includeMapped: z.boolean(),
});

// TODO: ADD TYPE
export const CohortExpression = z.unknown();
// TODO: ADD TYPE
export const CohortExpressionQueryOptions = z.unknown();

export const ConceptRecommended = Concept.omit({
  VALID_START_DATE: true,
  VALID_END_DATE: true,
}).extend({
  RELATIONSHIPS: z.array(z.string()),
});
