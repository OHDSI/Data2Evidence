// @ts-types="npm:@types/express"
import { Request } from "express";
import {
  IDuckdbConcept,
  FhirValueSet,
  FhirValueSetExpansion,
  FhirValueSetExpansionContainsWithExt,
  FhirResourceType,
  FhirConceptMapGroup,
  FhirConceptMap,
  FhirConceptMapElementWithExt,
  IConcept,
  Filters,
  IDuckdbFacet,
  DatasetDialects,
  IConceptHierarchy,
  DatasetDB,
  HybridSearchConfig,
} from "../types.ts";
import { CachedbDAO } from "./cachedb-dao.ts";
import { HanaHDBDao } from "./hana-hdb-dao.ts";
import { SystemPortalAPI } from "../api/portal-api.ts";
import { groupBy } from "../utils/helperUtil.ts";

export class CachedbService {
  private readonly token: string;
  private readonly datasetDB: DatasetDB;
  private readonly hybridSearchConfig: HybridSearchConfig;

  constructor(
    request: Request,
    datasetDB: DatasetDB,
    hybridSearchConfig: HybridSearchConfig
  ) {
    this.token = request.headers["authorization"]!;
    this.datasetDB = datasetDB;
    this.hybridSearchConfig = hybridSearchConfig;
  }

  /*
  Initialize in an optimal way
  */
  public static async createCacheDBService(
    request: Request,
    datasetId: string
  ): Promise<CachedbService> {
    const systemPortalApi = new SystemPortalAPI(request);
    const getDatasetDetails = async () => {
      const datasetDB = {
        ...(await systemPortalApi.getDatasetDetails(datasetId)),
        datasetId,
      };
      return datasetDB;
    };
    const getHybridSearch = async () => {
      const hybridSearchConfigData =
        await systemPortalApi.getHybridSearchConfig();
      return JSON.parse(hybridSearchConfigData.value);
    };
    const [datasetDB, hybridSearchConfig] = await Promise.all([
      getDatasetDetails(),
      getHybridSearch(),
    ]);
    return new CachedbService(request, datasetDB, hybridSearchConfig);
  }

  /*
  Get cachedbDao depending on dialect
  */
  private async getCachedbDaoFromDialect(): Promise<CachedbDAO | HanaHDBDao> {
    const {
      dialect,
      vocabSchemaName,
      databaseCode,
      schemaName,
      resultsSchemaName,
    } = this.datasetDB;
    if (this.hybridSearchConfig == undefined) {
      throw new Error("hybridSearchConfig undefined!");
    }
    const enableSemantic = this.hybridSearchConfig.isEnabled;
    const semanticRatio = enableSemantic
      ? parseFloat(this.hybridSearchConfig.semanticRatio)
      : 0;

    if (dialect === DatasetDialects.HANA) {
      return new HanaHDBDao(
        this.token,
        vocabSchemaName,
        databaseCode,
        semanticRatio,
        schemaName,
        resultsSchemaName,
      );
    }


    // By default return CachedbDAO
    return new CachedbDAO(
      vocabSchemaName,
      semanticRatio,
      databaseCode,
      schemaName,
      resultsSchemaName
    );
  }

  async getConcepts(
    pageNumber = 0,
    rowsPerPage: number,
    searchText = "",
    filters: Filters,
    sortBy?: string,
    sortOrder?: string,
  ) {
    try {
      const cachedbDao = await this.getCachedbDaoFromDialect();
      const result = await cachedbDao.getConcepts(
        pageNumber,
        Number(rowsPerPage),
        searchText,
        filters,
        sortBy,
        sortOrder,
      );
      return this.duckdbResultMapping(result);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getConceptIds(searchText = "", filters: Filters): Promise<number[]> {
    try {
      const cachedbDao = await this.getCachedbDaoFromDialect();
      return await cachedbDao.getConceptIds(searchText, filters);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getConceptsCount(searchText = "", filters: Filters): Promise<number> {
    try {
      const cachedbDao = await this.getCachedbDaoFromDialect();
      const result = await cachedbDao.getConceptsCount(searchText, filters);
      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getExactConcept(
    conceptName: string | number,
    conceptColumnName: "concept_name" | "concept_id" | "concept_code"
  ) {
    try {
      const cachedbDao = await this.getCachedbDaoFromDialect();
      const result = await cachedbDao.getExactConcept(
        conceptName,
        conceptColumnName
      );
      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getConceptFilterOptionsFaceted(
    searchText: string,
    filters: Filters
  ): Promise<IDuckdbFacet> {
    const cachedbDao = await this.getCachedbDaoFromDialect();
    return cachedbDao.getConceptFilterOptionsFaceted(searchText, filters);
  }

  async getTerminologyDetailsWithRelationships(conceptId: number) {
    console.info("Get list of concept details and connections");
    const defaultValue: FhirConceptMap = {
      resourceType: FhirResourceType.conceptmap,
      group: [],
    };
    try {
      const searchConcepts1: number[] = [conceptId];

      const cachedbDao = await this.getCachedbDaoFromDialect();
      const DuckdbResultConcept1 = await cachedbDao.getMultipleExactConcepts(
        searchConcepts1,
        true
      );
      if (!DuckdbResultConcept1) {
        return defaultValue;
      }

      const conceptC1: FhirValueSet =
        this.duckdbResultMapping(DuckdbResultConcept1);
      if (!conceptC1.expansion.contains) {
        return defaultValue;
      }
      const groups: FhirConceptMapGroup[] = [];

      if (conceptC1.expansion.contains.length > 0) {
        const detailsC1: FhirValueSetExpansionContainsWithExt =
          conceptC1.expansion.contains[0];
        const conceptRelations = await cachedbDao.getConceptRelationships(
          detailsC1.conceptId
        );

        const relationshipIds = conceptRelations.hits.map(
          (hit) => hit.relationship_id
        );
        const relationships = await cachedbDao.getRelationships(
          relationshipIds
        );

        const conceptIds2 = conceptRelations.hits.map(
          (hit) => hit.concept_id_2
        );

        const exactConcepts2 = await cachedbDao.getMultipleExactConcepts(
          conceptIds2,
          true
        );
        const exactConcepts2Mapped = this.duckdbResultMapping(exactConcepts2);

        const conceptIds3 = relationships.hits.map(
          (hit) => hit.relationship_concept_id
        );
        const exactConcepts3 = await cachedbDao.getMultipleExactConcepts(
          conceptIds3,
          true
        );
        const exactConcepts3Mapped = this.duckdbResultMapping(exactConcepts3);

        const conceptsWithRelationships = conceptRelations.hits
          .map((hit) => {
            const c2 = exactConcepts2Mapped.expansion.contains?.find(
              (hit2) => hit2.conceptId === hit.concept_id_2
            );
            const relationship = relationships.hits.find(
              (r) => r.relationship_id === hit.relationship_id
            );
            const detailsConcept3 =
              exactConcepts3Mapped.expansion.contains?.find(
                (c) => c.conceptId === relationship?.relationship_concept_id
              );
            if (!c2 || !detailsConcept3) {
              return null;
            }
            return {
              code: c2.conceptId,
              display: c2.display,
              vocabularyId: c2.system,
              equivalence: detailsConcept3.display,
            };
          })
          .filter((c) => c !== null) as {
          code: number;
          display: string;
          vocabularyId: string;
          equivalence: string;
        }[];

        const conceptRelationsGroupByVocab = groupBy(
          conceptsWithRelationships,
          "vocabularyId"
        );
        for (const targetVocab in conceptRelationsGroupByVocab) {
          const conceptMapElement: FhirConceptMapElementWithExt = {
            code: detailsC1.code,
            display: detailsC1.display,
            valueSet: conceptC1,
            target: conceptRelationsGroupByVocab[targetVocab],
          };
          groups.push({
            source: detailsC1.system,
            target: targetVocab,
            element: [conceptMapElement],
          });
        }
      }

      const conceptMap_ext: FhirConceptMap = {
        resourceType: FhirResourceType.conceptmap,
        group: groups,
      };
      console.info("Return concept details and connections");
      return conceptMap_ext;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getRecommendedConcepts(conceptIds: number[]) {
    try {
      const cachedbDao = await this.getCachedbDaoFromDialect();
      const recommendedConcepts = await cachedbDao.getExactConceptRecommended(
        conceptIds
      );

      if (recommendedConcepts.length === 0) {
        return [];
      }

      const mappedConceptIds = recommendedConcepts.map((e) => e.concept_id_2);

      const duckdbResult = await cachedbDao.getMultipleExactConcepts(
        mappedConceptIds
      );

      if (duckdbResult === null) {
        return [];
      }
      const duckdbMappedResult = this.duckdbResultMapping(duckdbResult);
      if (!duckdbMappedResult.expansion.contains) {
        return [];
      }
      // Result has to be mapped like this due to expected response from frontend
      const mappedResults = duckdbMappedResult.expansion.contains.map(
        (mappedResult) => ({
          ...mappedResult,
          conceptCode: mappedResult.code,
          conceptName: mappedResult.display,
          vocabularyId: mappedResult.system,
        })
      );
      return mappedResults;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getHierarchyDescendants(
    conceptId: number
  ): Promise<IConceptHierarchy[]> {
    const cachedbDao = await this.getCachedbDaoFromDialect();
    const result = await cachedbDao.getHierarchyDescendants(conceptId);
    return result;
  }

  async getHierarchyAncestors(
    conceptId: number,
    depth: number
  ): Promise<IConceptHierarchy[]> {
    const cachedbDao = await this.getCachedbDaoFromDialect();
    const result = await cachedbDao.getHierarchyAncestors(conceptId, depth);
    return result;
  }

  async getConceptsByIds(conceptIds: number[]) {
    if (conceptIds.length === 0) {
      return [];
    }
    const cachedbDao = await this.getCachedbDaoFromDialect();
    const result = await cachedbDao.getMultipleExactConcepts(conceptIds);
    if (!result) {
      return [];
    }
    const duckdbResultMap = this.duckdbResultMapping(result);
    if (!duckdbResultMap.expansion.contains) {
      return [];
    }
    return duckdbResultMap.expansion.contains;
  }

  async getConceptRelationshipMapsTo(conceptIds: number[]) {
    if (conceptIds.length === 0) {
      return [];
    }
    const cachedbDao = await this.getCachedbDaoFromDialect();
    const result = await cachedbDao.getConceptRelationship(
      conceptIds,
      "Maps to"
    );
    return result;
  }

  async getConceptsAndDescendantIds(
    conceptIds: number[],
    descendantIds: number[]
  ): Promise<number[]> {
    if (!conceptIds.length) {
      return [];
    }
    const conceptsAndDescendantIds: number[] = [];

    const cachedbDao = await this.getCachedbDaoFromDialect();

    // Ensures included concept IDs are present in vocab schema and valid
    const validConcepts = await cachedbDao.getMultipleExactConcepts(
      conceptIds,
      false
    );
    if (!validConcepts) {
      return [];
    }
    validConcepts.hits.forEach((concept) => {
      conceptsAndDescendantIds.push(concept.concept_id);
    });

    if (!descendantIds.length) {
      return conceptsAndDescendantIds;
    }

    const conceptDescendants = await cachedbDao.getExactConceptDescendants(
      descendantIds
    );
    conceptDescendants.forEach((concept) => {
      conceptsAndDescendantIds.push(concept.descendant_concept_id);
    });
    return conceptsAndDescendantIds;
  }

  private mapConceptWithFhirValueSetExpansionContains(item: IConcept) {
    const validity =
      Number(new Date(item.valid_end_date || -1)) > Number(new Date())
        ? "Valid"
        : "Invalid";

    const details: FhirValueSetExpansionContainsWithExt = {
      conceptId: item.concept_id,
      display: item.concept_name,
      domainId: item.domain_id,
      system: item.vocabulary_id,
      conceptClassId: item.concept_class_id,
      standardConcept: item.standard_concept,
      concept:
        item.standard_concept == null || item.standard_concept !== "S"
          ? "Non-standard"
          : "Standard",
      code: item.concept_code,
      // The date is stored as seconds from epoch, but new Date() expects ms
      validStartDate: item.valid_start_date
        ? new Date(
            typeof item.valid_start_date === "number"
              ? item.valid_start_date * 1000
              : item.valid_start_date
          ).toISOString()
        : new Date(0).toISOString(),
      validEndDate: item.valid_end_date
        ? new Date(
            typeof item.valid_start_date === "number"
              ? item.valid_end_date * 1000
              : item.valid_end_date
          ).toISOString()
        : "",
      validity,
      score: item.score,
    };
    return details;
  }

  private duckdbResultMapping(DuckdbResult: IDuckdbConcept): FhirValueSet {
    const valueSetExpansionContains = DuckdbResult.hits.map((data) => {
      return this.mapConceptWithFhirValueSetExpansionContains(data);
    });

    const valueSetExpansion: FhirValueSetExpansion = {
      total: DuckdbResult.hits.length > 0 ? DuckdbResult.totalHits : 0,
      offset: 1,
      timestamp: new Date(),
      contains: valueSetExpansionContains,
    };
    const result: FhirValueSet = {
      resourceType: FhirResourceType.valueset,
      expansion: valueSetExpansion,
    };
    return result;
  }
}

export const individualFilterWhereOR = (comparators: string[]): string => {
  if (comparators.length === 0) {
    return "";
  } else {
    return `(${comparators.join(" OR ")})`;
  }
};
