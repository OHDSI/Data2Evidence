import { z } from "zod";
import {
  Concept,
  ConceptRecommended,
  ConceptRelated,
  ConceptSetExpression,
} from "../types.ts";

export const VocabularySourceInfo = z.object({
  version: z.string(),
  dialect: z.string(),
});

export type IVocabularySourceInfo = z.infer<typeof VocabularySourceInfo>;

export const ConceptSetExpressionDto = z.object({
  items: z.array(ConceptSetExpression),
});

export const ConceptListDto = z.object({
  IS_LEXICAL: z.string().optional(),
  CONCEPT_CLASS_ID: z.array(z.string()).optional(),
  VOCABULARY_ID: z.array(z.string()).optional(),
  DOMAIN_ID: z.array(z.string()).optional(),
  INVALID_REASON: z.string().optional(),
  STANDARD_CONCEPT: z.string().optional(),
  QUERY: z.string(),
});
export type IConceptListDto = z.infer<typeof ConceptListDto>;

export const ConceptListResponseDto = z.array(Concept);
export type IConceptListResponseDto = z.infer<typeof ConceptListResponseDto>;

export const ConceptResponseDto = Concept;

export const ConceptRelatedResponseDto = z.array(ConceptRelated);
export type IConceptRelatedResponseDto = z.infer<
  typeof ConceptRelatedResponseDto
>;

export const LookupIdentifierAncestorsDto = z.object({
  ancestors: z.array(z.number()),
  descendants: z.array(z.number()),
});
export const LookupIdentifierAncestorsResponseDto = z.record(
  z.string(),
  z.array(z.number())
);
export type ILookupIdentifierAncestorsResponseDto = z.infer<
  typeof LookupIdentifierAncestorsResponseDto
>;

export const ConceptRecommendedListResponseDto = z.array(ConceptRecommended);
export type IConceptRecommendedListResponseDto = z.infer<
  typeof ConceptRecommendedListResponseDto
>;

export const DomainsResponseDto = z.array(
  z.object({
    DOMAIN_NAME: z.string(),
    DOMAIN_ID: z.string(),
    DOMAIN_CONCEPT_ID: z.number(),
  })
);
export type IDomainsResponseDto = z.infer<typeof DomainsResponseDto>;

export const VocabulariesResponseDto = z.array(
  z.object({
    VOCABULARY_ID: z.string(),
    VOCABULARY_NAME: z.string(),
    VOCABULARY_REFERENCE: z.string(),
    VOCABULARY_VERSION: z.string(),
    VOCABULARY_CONCEPT_ID: z.number(),
  })
);
export type IVocabulariesResponseDto = z.infer<typeof VocabulariesResponseDto>;
