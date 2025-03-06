import { z } from "zod";

import { IResolveConceptSetExpressionConcept } from "../api/types.ts";
import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import {
  ConceptSetExpressionDto,
  IConceptRecommendedListResponseDto,
  IVocabulariesResponseDto,
  IConceptRelatedResponseDto,
} from "../dto/vocabulary.ts";
import { CachedbDAO } from "../dao/cachedb.dao.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { IConcept } from "../types.ts";
import { IAncestorsLookup } from "../dao/types.ts";
import { CachedbDialect } from "../dao/types.ts";
import {
  ILookupIdentifierAncestorsResponseDto,
  IVocabularySourceInfo,
  IConceptListResponseDto,
  IDomainsResponseDto,
} from "../dto/vocabulary.ts";
import { AnalyticsSvcAPI } from "../api/AnalyticsAPI.ts";

export const getVocabularySourceInfo = async (
  token: string,
  datasetId: string
): Promise<IVocabularySourceInfo> => {
  // Get cdm version
  const analyticsSvcApi = new AnalyticsSvcAPI(token);
  const version = await analyticsSvcApi.getCdmVersion(datasetId);

  // Get dialect
  const portalServerApi = new PortalServerAPI(token);
  const { dialect } = await portalServerApi.getDatasetDetails(datasetId);

  // Construct response
  const result = {
    version,
    dialect,
  };
  return result;
};

export const resolveConceptSetExpression = async (
  token: string,
  datasetId: string,
  conceptSetExpression: z.infer<typeof ConceptSetExpressionDto>
): Promise<number[]> => {
  // Map concept set expressions to format for terminologysvc api
  const concepts: IResolveConceptSetExpressionConcept[] =
    conceptSetExpression.items.map((item) => {
      return {
        id: item.concept.CONCEPT_ID,
        useMapped: item.includeMapped,
        useDescendants: item.includeDescendants,
      };
    });

  const terminologySvcApi = new TerminologySvcAPI(token);
  const result = await terminologySvcApi.resolveConceptSetExpression(
    datasetId,
    concepts
  );

  return result;
};

export const getIncludedConceptsCount = async (
  token: string,
  datasetId: string,
  conceptSetExpression: z.infer<typeof ConceptSetExpressionDto>
): Promise<number> => {
  // Map concept set expressions to format for terminologysvc api
  const concepts: IResolveConceptSetExpressionConcept[] =
    conceptSetExpression.items.map((item) => {
      return {
        id: item.concept.CONCEPT_ID,
        useMapped: item.includeMapped,
        useDescendants: item.includeDescendants,
      };
    });

  const terminologySvcApi = new TerminologySvcAPI(token);
  const result = await terminologySvcApi.resolveConceptSetExpression(
    datasetId,
    concepts
  );

  return result.length;
};

export const getConceptsFromIdentifiers = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<IConcept[]> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );

  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const concepts = await cachedbDao.getConceptsFromIdentifiers(
    vocabSchemaName,
    conceptIds
  );

  const mappedConcepts = concepts.map((concept) => {
    return {
      ...concept,
      INVALID_REASON_CAPTION: _getInvalidReasonCaption(concept.INVALID_REASON),
      STANDARD_CONCEPT_CAPTION: _getStandardConceptCaption(
        concept.STANDARD_CONCEPT
      ),
      VALID_START_DATE: Date.parse(concept.VALID_START_DATE),
      VALID_END_DATE: Date.parse(concept.VALID_END_DATE),
    };
  });

  return mappedConcepts;
};

export const getAncestorsFromIdentifiers = async (
  token: string,
  datasetId: string,
  ancestors: number[],
  descendants: number[]
): Promise<ILookupIdentifierAncestorsResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );

  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const results = await cachedbDao.getAncestorsFromIdentifiers(
    vocabSchemaName,
    ancestors,
    descendants
  );

  // Group descendant_ids against ancestor_ids
  const mappedResults = results.reduce(
    (acc: ILookupIdentifierAncestorsResponseDto, e: IAncestorsLookup) => {
      if (acc[e.descendant_id] === undefined) {
        acc[e.descendant_id] = [e.ancestor_id];
      } else {
        acc[e.descendant_id].push(e.ancestor_id);
      }
      return acc;
    },
    {}
  );

  return mappedResults;
};

export const getRecommendedConceptsFromIdentifiers = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<IConceptRecommendedListResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );

  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const recommendedConceptsMapping =
    await cachedbDao.getExactConceptRecommended(vocabSchemaName, conceptIds);
  if (recommendedConceptsMapping.length === 0) {
    return [];
  }

  const recommendedConceptMappingIds = recommendedConceptsMapping.map(
    (e) => e.concept_id_2
  );

  const recommendedConcepts = await cachedbDao.getMultipleExactConcepts(
    vocabSchemaName,
    recommendedConceptMappingIds
  );

  if (recommendedConcepts === null) {
    return [];
  }

  // Construct response
  const result: IConceptRecommendedListResponseDto = recommendedConcepts.map(
    (recommendedConcept) => {
      // Map relationship id back to recommendedConcepts
      const relationships = recommendedConceptsMapping.reduce(
        (acc: string[], recommendedConceptMapping) => {
          if (
            recommendedConcept.concept_id ===
            Number(recommendedConceptMapping.concept_id_2)
          ) {
            // Only push if relationship_id does not exist in acc
            if (!acc.includes(recommendedConceptMapping.relationship_id)) {
              acc.push(recommendedConceptMapping.relationship_id);
            }
          }
          return acc;
        },
        []
      );

      return {
        CONCEPT_ID: recommendedConcept.concept_id,
        CONCEPT_NAME: recommendedConcept.concept_name,
        STANDARD_CONCEPT: recommendedConcept.standard_concept,
        STANDARD_CONCEPT_CAPTION: _getStandardConceptCaption(
          recommendedConcept.standard_concept
        ),
        INVALID_REASON: recommendedConcept.invalid_reason,
        INVALID_REASON_CAPTION: _getInvalidReasonCaption(
          recommendedConcept.invalid_reason
        ),
        CONCEPT_CODE: recommendedConcept.concept_code,
        DOMAIN_ID: recommendedConcept.domain_id,
        VOCABULARY_ID: recommendedConcept.vocabulary_id,
        CONCEPT_CLASS_ID: recommendedConcept.concept_class_id,
        RELATIONSHIPS: relationships,
      };
    }
  );
  return result;
};

export const searchConcept = async (
  token: string,
  datasetId: string,
  query: string
): Promise<IConceptListResponseDto> => {
  const terminologySvcApi = new TerminologySvcAPI(token);

  // ATLAS UI expects all concept search results in a single request, so send count as 9999
  const concepts = await terminologySvcApi.searchConcept(
    datasetId,
    query,
    0,
    9999
  );

  // Map results to webapi format
  const mappedResults = concepts.expansion.contains.map((concept) => {
    return {
      CONCEPT_ID: concept.conceptId,
      CONCEPT_NAME: concept.display,
      STANDARD_CONCEPT: _getStandardConceptFromCaption(concept.concept),
      STANDARD_CONCEPT_CAPTION: concept.concept,
      INVALID_REASON: _getInvalidReasonFromCaption(concept.validity),
      INVALID_REASON_CAPTION: concept.validity,
      CONCEPT_CODE: concept.code,
      DOMAIN_ID: concept.domainId,
      VOCABULARY_ID: concept.system,
      CONCEPT_CLASS_ID: concept.conceptClassId,
      VALID_START_DATE: Date.parse(concept.validStartDate),
      VALID_END_DATE: Date.parse(concept.validEndDate),
    };
  });
  return mappedResults;
};

export const getConceptById = async (
  token: string,
  datasetId: string,
  conceptId: number
): Promise<IConcept> => {
  const terminologySvcApi = new TerminologySvcAPI(token);
  const concept = await terminologySvcApi.getConceptById(datasetId, conceptId);

  // Map results to webapi format
  const mappedResults = {
    CONCEPT_ID: concept.concept_id,
    CONCEPT_NAME: concept.concept_name,
    STANDARD_CONCEPT: concept.standard_concept,
    STANDARD_CONCEPT_CAPTION: _getStandardConceptCaption(
      concept.standard_concept
    ),
    INVALID_REASON: concept.invalid_reason ?? "",
    INVALID_REASON_CAPTION: _getInvalidReasonCaption(concept.invalid_reason),
    CONCEPT_CODE: concept.concept_code,
    DOMAIN_ID: concept.domain_id,
    VOCABULARY_ID: concept.vocabulary_id,
    CONCEPT_CLASS_ID: concept.concept_class_id,
    VALID_START_DATE: Date.parse(concept.valid_start_date),
    VALID_END_DATE: Date.parse(concept.valid_end_date),
  };
  return mappedResults;
};

export const getMappedConcepts = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<IConceptListResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );
  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const concepts = await cachedbDao.getMappedConceptsLookup(
    vocabSchemaName,
    conceptIds
  );

  // Map results to webapi format
  const mappedResults: IConceptListResponseDto = concepts.map((concept) => {
    return {
      CONCEPT_ID: concept.concept_id,
      CONCEPT_NAME: concept.concept_name,
      STANDARD_CONCEPT: concept.standard_concept,
      STANDARD_CONCEPT_CAPTION: _getStandardConceptCaption(
        concept.standard_concept
      ),
      INVALID_REASON: concept.invalid_reason,
      INVALID_REASON_CAPTION: _getInvalidReasonCaption(concept.invalid_reason),
      CONCEPT_CODE: concept.concept_code,
      DOMAIN_ID: concept.domain_id,
      VOCABULARY_ID: concept.vocabulary_id,
      CONCEPT_CLASS_ID: concept.concept_class_id,
      VALID_START_DATE: Date.parse(concept.valid_start_date as string),
      VALID_END_DATE: Date.parse(concept.valid_end_date as string),
    };
  });
  return mappedResults;
};

export const getDomains = async (
  token: string,
  datasetId: string
): Promise<IDomainsResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );
  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const domains = await cachedbDao.getDomains(vocabSchemaName);

  // Map results to webapi format
  const mappedResults: IDomainsResponseDto = domains.map((domain) => {
    return {
      DOMAIN_NAME: domain.domain_name,
      DOMAIN_ID: domain.domain_id,
      DOMAIN_CONCEPT_ID: domain.domain_concept_id,
    };
  });
  return mappedResults;
};

export const getVocabularies = async (
  token: string,
  datasetId: string
): Promise<IVocabulariesResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );
  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const vocabularies = await cachedbDao.getVocabularies(vocabSchemaName);

  // Map results to webapi format
  const mappedResults: IVocabulariesResponseDto = vocabularies.map(
    (vocabulary) => {
      return {
        VOCABULARY_ID: vocabulary.vocabulary_id,
        VOCABULARY_NAME: vocabulary.vocabulary_name,
        VOCABULARY_REFERENCE: vocabulary.vocabulary_reference,
        VOCABULARY_VERSION: vocabulary.vocabulary_version,
        VOCABULARY_CONCEPT_ID: vocabulary.vocabulary_concept_id,
      };
    }
  );
  return mappedResults;
};

export const getRelatedConceptsFromIdentifier = async (
  token: string,
  datasetId: string,
  conceptId: number
): Promise<IConceptRelatedResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const { vocabSchemaName } = await portalServerApi.getDatasetDetails(
    datasetId
  );
  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.DUCKDB);
  const relatedConceptsFromIdentifier =
    await cachedbDao.getRelatedConceptsFromIdentifier(
      vocabSchemaName,
      conceptId
    );

  // Map results to webapi format
  const mappedResults: IConceptRelatedResponseDto = [];
  relatedConceptsFromIdentifier.forEach((relatedConcept) => {
    const currentConcept = mappedResults.find(
      (e) => e.CONCEPT_ID === relatedConcept.concept_id
    );

    if (currentConcept === undefined) {
      mappedResults.push({
        CONCEPT_ID: relatedConcept.concept_id,
        CONCEPT_NAME: relatedConcept.concept_name,
        STANDARD_CONCEPT: relatedConcept.standard_concept,
        STANDARD_CONCEPT_CAPTION: _getStandardConceptCaption(
          relatedConcept.standard_concept
        ),
        INVALID_REASON: relatedConcept.invalid_reason,
        INVALID_REASON_CAPTION: _getInvalidReasonCaption(
          relatedConcept.invalid_reason
        ),
        CONCEPT_CODE: relatedConcept.concept_code,
        DOMAIN_ID: relatedConcept.domain_id,
        VOCABULARY_ID: relatedConcept.vocabulary_id,
        CONCEPT_CLASS_ID: relatedConcept.concept_class_id,
        VALID_START_DATE: Date.parse(relatedConcept.valid_start_date),
        VALID_END_DATE: Date.parse(relatedConcept.valid_end_date),
        RELATIONSHIPS: [
          {
            RELATIONSHIP_NAME: relatedConcept.relationship_name,
            RELATIONSHIP_DISTANCE: relatedConcept.relationship_distance,
          },
        ],
        RELATIONSHIP_CAPTION: relatedConcept.relationship_name,
      });
    } else {
      currentConcept.RELATIONSHIPS.push({
        RELATIONSHIP_NAME: relatedConcept.relationship_name,
        RELATIONSHIP_DISTANCE: relatedConcept.relationship_distance,
      });
    }
  });
  return mappedResults;
};

const _getStandardConceptCaption = (standardConcept: string | null): string => {
  if (standardConcept == null) return "Unknown";

  switch (standardConcept) {
    case "N":
      return "Non-Standard";
    case "S":
      return "Standard";
    case "C":
      return "Classification";
    default:
      return "Unknown";
  }
};

const _getInvalidReasonCaption = (invalidReason: string | null): string => {
  if (invalidReason == null) return "Unknown";

  switch (invalidReason) {
    case "V":
      return "Valid";
    case "D":
      return "Invalid";
    case "U":
      return "Invalid";
    default:
      return "Unknown";
  }
};

const _getStandardConceptFromCaption = (standardConcept: string): string => {
  if (standardConcept == "Unknown") return "";

  switch (standardConcept) {
    case "Non-Standard":
      return "N";
    case "Standard":
      return "S";
    case "Classification":
      return "C";
    default:
      return "";
  }
};

const _getInvalidReasonFromCaption = (invalidReason: string): string => {
  if (invalidReason == "Unknown") return "";

  switch (invalidReason) {
    case "Valid":
      return "V";
    case "Invalid":
      return "U";
    default:
      return "";
  }
};
