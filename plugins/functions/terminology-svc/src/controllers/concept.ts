// @ts-types="npm:@types/express"
import { NextFunction, Response, Request } from "express";
import { CachedbService } from "../services/cachedb.ts";
import * as schemas from "./validators/conceptSchemas.ts";
import {
  ConceptHierarchyEdge,
  ConceptHierarchyNode,
  Filters,
} from "../types.ts";
import { GetConceptFilterOptions } from "./responseTypes.ts";

export const getConcepts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get list of concepts");
  try {
    const {
      query: {
        offset,
        count: rowsPerPage,
        datasetId,
        code: searchText,
        filter,
        sortBy,
        sortOrder,
      },
    } = schemas.getConcepts.parse(req);

    const pageNumber = Math.floor(offset / rowsPerPage);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );

    const concepts = await cachedbService.getConcepts(
      pageNumber,
      Number(rowsPerPage),
      searchText,
      filter,
      sortBy,
      sortOrder,
    );
    res.send(concepts);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const getConceptIds = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      query: { datasetId, code: searchText, filter },
    } = schemas.getConceptIds.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );

    const ids = await cachedbService.getConceptIds(searchText, filter);
    res.send(ids);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const getConceptsCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get count of concepts based on search text and filter");
  try {
    const {
      query: { datasetId, code: searchText, filter },
    } = schemas.getConceptsCount.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );

    const conceptsCount = await cachedbService.getConceptsCount(
      searchText,
      filter
    );
    res.send(conceptsCount);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const searchConceptByName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get concept by name");
  try {
    const {
      body: { datasetId, conceptName },
    } = schemas.searchConceptByName.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const concepts = await cachedbService.getExactConcept(
      conceptName,
      "concept_name"
    );
    res.send(concepts);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const searchConceptById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get concept by id");
  try {
    const {
      body: { datasetId, conceptId },
    } = schemas.searchConceptById.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const concepts = await cachedbService.getExactConcept(
      conceptId,
      "concept_id"
    );
    res.send(concepts);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const searchConceptByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get concept by code");
  try {
    const {
      body: { datasetId, conceptCode },
    } = schemas.searchConceptByCode.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const concepts = await cachedbService.getExactConcept(
      conceptCode,
      "concept_code"
    );
    res.send(concepts);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const getRecommendedConcepts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get concept by code");
  try {
    const {
      body: { datasetId, conceptIds },
    } = schemas.getRecommendedConcepts.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const concepts = await cachedbService.getRecommendedConcepts(conceptIds);
    res.send(concepts);
  } catch (e) {
    console.error(JSON.stringify(e));
    next(e);
  }
};

export const getConceptFilterOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get concept filter options");
  try {
    const {
      query: { datasetId, searchText, filter },
    } = schemas.getConceptFilterOptions.parse(req);

    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const filterOptions = await cachedbService.getConceptFilterOptionsFaceted(
      searchText,
      filter
    );
    const response: GetConceptFilterOptions = { filterOptions };
    res.send(response);
  } catch (e) {
    next(e);
  }
};

export const getTerminologyDetailsWithRelationships = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info("Get list of concept details and connections");
  try {
    const {
      query: { datasetId, conceptId },
    } = schemas.getTerminologyDetailsWithRelationships.parse(req);
    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );
    const details = await cachedbService.getTerminologyDetailsWithRelationships(
      conceptId
    );
    res.send(details);
  } catch (e) {
    next(e);
  }
};

export const getConceptHierarchy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      query: { datasetId, conceptId, depth },
    } = schemas.getConceptHierarchy.parse(req);
    const cachedbService = await CachedbService.createCacheDBService(
      req,
      datasetId
    );

    const promises = [
      // Get first level descendants of concept
      cachedbService.getHierarchyDescendants(conceptId),
      // Recursively get ancestors of concept depending on depth
      cachedbService.getHierarchyAncestors(conceptId, depth),
    ];
    const promiseResults = await Promise.all(promises);

    // Combine both descendants and ancestors results
    const conceptHierarchy = [...promiseResults[0], ...promiseResults[1]];

    // Map conceptHierarchy to nodes and edges
    const edges: ConceptHierarchyEdge[] = [];
    const nodes: ConceptHierarchyNode[] = [];
    conceptHierarchy.map((e) => {
      edges.push({
        source: e.ancestor_concept_id,
        target: e.descendant_concept_id,
      });

      // Only push into nodes if it does not contain an object with the same conceptId as the incoming object's conceptId
      if (
        !nodes.find((node_element) => node_element.conceptId === e.concept_id)
      ) {
        nodes.push({
          conceptId: e.concept_id,
          display: e.concept_name,
          level: e.depth,
        });
      }
    });

    res.send({ edges, nodes });
  } catch (e) {
    next(e);
  }
};

export const getStandardConcepts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      body: { datasetId, data },
    } = schemas.getStandardConcepts.parse(req);

    const results = await Promise.all(
      data.map(async (dataItem) => {
        const { domainId, searchText, index } = dataItem;

        const filters: Filters = {
          conceptClassId: [],
          domainId: [],
          standardConcept: ["S"],
          vocabularyId: [],
          validity: [],
        };

        try {
          const cachedbService = await CachedbService.createCacheDBService(
            req,
            datasetId
          );
          if (domainId) {
            const domainIdFacets = (
              await cachedbService.getConceptFilterOptionsFaceted(
                dataItem.searchText,
                filters
              )
            ).domainId;

            const keyExists = Object.keys(domainIdFacets).some(
              (objKey) => objKey.toUpperCase() === domainId.toUpperCase()
            );

            if (keyExists) {
              filters.domainId.push(domainId);
            }
          }

          const concepts = await cachedbService.getConcepts(
            0,
            1,
            searchText,
            filters
          );

          if (!concepts?.expansion.contains?.length) {
            return {};
          }

          const [conceptResults] = concepts.expansion.contains;

          return {
            index,
            conceptId: conceptResults.conceptId,
            conceptName: conceptResults.display,
            conceptCode: conceptResults.code,
            domainId: conceptResults.domainId,
            vocabularyId: conceptResults.system,
          };
        } catch (error) {
          console.error(error);
          throw error;
        }
      })
    );

    res.send(results);
  } catch (e) {
    next(e);
  }
};

export const checkConceptCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body: { datasetId, conceptIds } } = schemas.checkConceptCoverage.parse(req);
    const cachedbService = await CachedbService.createCacheDBService(req, datasetId);
    const foundConcepts = await cachedbService.getConceptsByIds(conceptIds);
    const foundIds = new Set(foundConcepts.map((c) => c.conceptId));
    res.send({
      found: conceptIds.filter((id) => foundIds.has(id)),
      missing: conceptIds.filter((id) => !foundIds.has(id)),
    });
  } catch (e) {
    next(e);
  }
};
