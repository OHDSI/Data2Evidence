import { z } from "zod";
import { Concept, ConceptRecommended, ConceptSetExpression } from "../types.ts";

export const ConceptSetExpressionDto = z.object({
  items: z.array(ConceptSetExpression),
});

export const ConceptListResponseDto = z.array(Concept);

export const ConceptResponseDto = Concept;

export const LookupIdentifierAncestorsDto = z.object({
  ancestors: z.array(z.number()),
  descendants: z.array(z.number()),
});
export const LookupIdentifierAncestorsResponseDto = z.record(
  z.string(),
  z.array(z.number())
);

export const ConceptRecommendedListResponseDto = z.array(ConceptRecommended);

export const DomainsResponseDto = z.array(
  z.object({
    DOMAIN_NAME: z.string(),
    DOMAIN_ID: z.string(),
    DOMAIN_CONCEPT_ID: z.number(),
  })
);

export const VocabulariesResponseDto = z.array(
  z.object({
    VOCABULARY_ID: z.string(),
    VOCABULARY_NAME: z.string(),
    VOCABULARY_REFERENCE: z.string(),
    VOCABULARY_VERSION: z.string(),
    VOCABULARY_CONCEPT_ID: z.number(),
  })
);
