// @ts-types="npm:@types/express"
import { NextFunction, Response, Request } from "express";
import { SystemPortalAPI } from "../api/portal-api.ts";
import { JwtPayload, decode } from "jsonwebtoken";
import * as schemas from "./validators/conceptSetSchemas.ts";
import { CachedbService } from "../services/cachedb.ts";
import { ConceptSetConcept } from "../types.ts";

const getUserIdFromToken = (token: string): string => {
  const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
  const userId = decodedToken.sub as string;
  return userId;
};

const addOwner = <T>(object: T, isNewEntity = false, userId: string) => {
  const currentDate = new Date().toISOString();

  if (isNewEntity) {
    return {
      ...object,
      createdBy: userId,
      modifiedBy: userId,
      createdDate: currentDate,
      modifiedDate: currentDate,
    };
  }

  return {
    ...object,
    modifiedBy: userId,
    modifiedDate: currentDate,
  };
};

export const getConceptSets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserIdFromToken(req.headers["authorization"]!);
    const { query } = schemas.getConceptSets.parse(req);
    const systemPortalApi = new SystemPortalAPI(req);
    const conceptSets = await systemPortalApi.getUserConceptSets(
      userId,
      query.datasetId
    );
    res.send(conceptSets);
  } catch (e) {
    next(e);
  }
};

export const createConceptSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, query } = schemas.createConceptSet.parse(req);
    const systemPortalApi = new SystemPortalAPI(req);

    const conceptSetId = await systemPortalApi.getConceptSetSequenceNextval(
      query.datasetId
    );

    const userId = getUserIdFromToken(req.headers["authorization"]!);
    const newConceptSet = addOwner(
      {
        id: conceptSetId,
        ...body,
      },
      true,
      userId
    );

    await systemPortalApi.createConceptSet(
      {
        serviceArtifact: newConceptSet,
      },
      query.datasetId
    );

    res.send(newConceptSet.id);
  } catch (e) {
    next(e);
  }
};

export const getConceptSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query, params } = schemas.getConceptSet.parse(req);

    const getCachedbservice = async () => {
      return await CachedbService.createCacheDBService(req, datasetId);
    };

    const getConceptSet = async () => {
      const systemPortalApi = new SystemPortalAPI(req);
      return await systemPortalApi.getConceptSetById(params.conceptSetId, query.datasetId);
    }

    const [cachedbService, conceptSet] = await Promise.all([getCachedbservice(), getConceptSet()]);

    const conceptIds = conceptSet.concepts.map((c) => c.id);
    const concepts = await cachedbService.getConceptsByIds(
      conceptIds,
      query.datasetId
    );
    const conceptSetWithConceptDetails = {
      ...conceptSet,
      concepts: concepts.map((concept) => {
        const conceptFromSet = conceptSet.concepts.find(
          (c) => c.id === concept.conceptId
        );
        return {
          ...concept,
          ...conceptFromSet,
          conceptCode: concept.code,
          conceptName: concept.display,
          vocabularyId: concept.system,
        };
      }),
    };
    res.send(conceptSetWithConceptDetails);
  } catch (e) {
    next(e);
  }
};

export const updateConceptSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, params, query } = schemas.updateConceptSet.parse(req);
    const userId = getUserIdFromToken(req.headers["authorization"]!);
    const updatedConceptSet = addOwner(body, false, userId);
    const systemPortalApi = new SystemPortalAPI(req);
    await systemPortalApi.updateConceptSet(
      { id: params.conceptSetId, serviceArtifact: updatedConceptSet },
      query.datasetId
    );
    res.send(params.conceptSetId);
  } catch (e) {
    next(e);
  }
};
export const removeConceptSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { params, query } = schemas.removeConceptSet.parse(req);
    const systemPortalApi = new SystemPortalAPI(req);
    await systemPortalApi.deleteConceptSet(
      params.conceptSetId,
      query.datasetId
    );
    res.send(params.conceptSetId);
  } catch (e) {
    next(e);
  }
};

export const getIncludedConcepts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const timestamp = (new Date()).valueOf();
    console.time(`time-terminology-svc-getIncludedConcepts-${timestamp}`)
    console.time(`time-terminology-svc-getIncludedConcepts-initialize-${timestamp}`)

    const { body } = schemas.getIncludedConcepts.parse(req);
    const { conceptSetIds, datasetId } = body;

    const getCachedbservice = async () => {
      return await CachedbService.createCacheDBService(req, datasetId);
    };

    const conceptsSetsDb = conceptSetIds.map(async (conceptSetId) => {
      const systemPortalApi = new SystemPortalAPI(req);
      const conceptSet = await systemPortalApi.getConceptSetById(
        conceptSetId,
        datasetId
      );
      return conceptSet;
    });

    const [cachedbService, ...rawConceptSets] = await Promise.all([
      getCachedbservice(),
      ...conceptsSetsDb,
    ]);
    console.timeEnd(`time-terminology-svc-getIncludedConcepts-initialize-${timestamp}`)
    console.time(`time-terminology-svc-getIncludedConcepts-promises-${timestamp}`)
    const promises = rawConceptSets.map(async (conceptSet) => {
      const conceptIds = conceptSet.concepts.map((c) => c.id);
      const concepts = await cachedbService.getConceptsByIds(
        conceptIds,
        datasetId
      );
      const conceptSetWithConceptDetails = {
        ...conceptSet,
        concepts: concepts.map((concept) => {
          const conceptFromSet = conceptSet.concepts.find(
            (c) => c.id === concept.conceptId
          );
          return {
            ...concept,
            ...conceptFromSet,
            conceptCode: concept.code,
            conceptName: concept.display,
            vocabularyId: concept.system,
          };
        }),
      };
      return conceptSetWithConceptDetails;
    });

    const conceptSets = await Promise.all(promises);

    const conceptSetConcepts: ConceptSetConcept[] = [];
    conceptSets.forEach((conceptSet) => {
      conceptSet.concepts.forEach((concept) => {
        conceptSetConcepts.push({
          id: concept.id as number,
          useDescendants: concept.useDescendants as boolean,
          useMapped: concept.useMapped as boolean,
          isExcluded: concept.isExcluded as boolean,
        });
      });
    });
    console.timeEnd(`time-terminology-svc-getIncludedConcepts-promises-${timestamp}`)
    console.time(`time-terminology-svc-getIncludedConcepts-_resolveConceptSetConcepts-${timestamp}`)
    const uniqueConceptIds = await _resolveConceptSetConcepts(
      cachedbService,
      conceptSetConcepts,
      datasetId
    );
    console.timeEnd(`time-terminology-svc-getIncludedConcepts-_resolveConceptSetConcepts-${timestamp}`)
    console.timeEnd(`time-terminology-svc-getIncludedConcepts-${timestamp}`)
    res.send(uniqueConceptIds);
  } catch (e) {
    console.error("Error getting included concepts for concept sets!");
    next(e);
  }
};

export const resolveConceptSetExpression = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body } = schemas.resolveConceptSetExpression.parse(req);
    const { concepts, datasetId } = body;
    const cachedbService = await CachedbService.createCacheDBService(req, datasetId);

    const uniqueConceptIds = await _resolveConceptSetConcepts(
      cachedbService,
      concepts,
      datasetId
    );

    res.send(uniqueConceptIds);
  } catch (e) {
    console.error("Error resolving concept set expression for concepts!");
    next(e);
  }
};

const _resolveConceptSetConcepts = async (
  cachedbService: CachedbService,
  conceptSetConcepts: ConceptSetConcept[],
  datasetId: string
): Promise<number[]> => {
  const conceptIds: number[] = [];
  const conceptIdsToIncludeDescendant: number[] = [];
  const conceptIdsToIncludeMapped: number[] = [];
  const conceptIdsToIncludeMappedAndDescendant: number[] = [];

  const conceptIdsToExclude: number[] = [];
  const conceptIdsToExcludeDescendant: number[] = [];
  const conceptIdsToExcludeMapped: number[] = [];
  const conceptIdsToExcludeMappedAndDescendant: number[] = [];

  conceptSetConcepts.forEach((concept) => {
    if (!concept.id) {
      return;
    }

    if (concept.isExcluded) {
      conceptIdsToExclude.push(concept.id);
    } else {
      conceptIds.push(concept.id);
    }

    // useDescendants
    if (concept.useDescendants) {
      if (concept.isExcluded) {
        conceptIdsToExcludeDescendant.push(concept.id);
      } else {
        conceptIdsToIncludeDescendant.push(concept.id);
      }
    }

    // useMapped
    if (concept.useMapped) {
      if (concept.isExcluded) {
        conceptIdsToExcludeMapped.push(concept.id);
      } else {
        conceptIdsToIncludeMapped.push(concept.id);
      }

      // useMapped && useDescendants
      if (concept.useDescendants) {
        if (concept.isExcluded) {
          conceptIdsToExcludeMappedAndDescendant.push(concept.id);
        } else {
          conceptIdsToIncludeMappedAndDescendant.push(concept.id);
        }
      }
    }
  });

  if (conceptIds.length === 0) {
    return [];
  }

  const [conceptSetConceptIdsToInclude, conceptSetConceptIdsToExclude] =
    await Promise.all([
      _getConceptSetConceptIds(
        cachedbService,
        datasetId,
        conceptIds,
        conceptIdsToIncludeDescendant,
        conceptIdsToIncludeMapped,
        conceptIdsToIncludeMappedAndDescendant
      ),
      _getConceptSetConceptIds(
        cachedbService,
        datasetId,
        conceptIdsToExclude,
        conceptIdsToExcludeDescendant,
        conceptIdsToExcludeMapped,
        conceptIdsToExcludeMappedAndDescendant
      ),
    ]);

  // Get included concepts difference excluded concepts
  const conceptSetConceptIds = Array.from(
    new Set(conceptSetConceptIdsToInclude).difference(
      new Set(conceptSetConceptIdsToExclude)
    )
  );
  return conceptSetConceptIds;
};

const _getConceptSetConceptIds = async (
  cachedbService: CachedbService,
  datasetId: string,
  conceptIds: number[],
  conceptIdsToIncludeDescendant: number[],
  conceptIdsToIncludeMapped: number[],
  conceptIdsToIncludeMappedAndDescendant: number[]
): Promise<number[]> => {
  // Return early if conceptIds is empty
  if (conceptIds.length === 0) {
    return [];
  }

  const [includedConceptIds, mappedConceptIds] = await Promise.all([
    cachedbService.getConceptsAndDescendantIds(
      conceptIds,
      conceptIdsToIncludeDescendant,
      datasetId
    ),
    (async () => {
      const mappedConceptsAndDescendantIds =
        await cachedbService.getConceptsAndDescendantIds(
          conceptIdsToIncludeMapped,
          conceptIdsToIncludeMappedAndDescendant,
          datasetId
        );

      const mappedConceptIds =
        await cachedbService.getConceptRelationshipMapsTo(
          mappedConceptsAndDescendantIds,
          datasetId
        );
      return mappedConceptIds;
    })(),
  ]);

  mappedConceptIds.forEach((concept) => {
    includedConceptIds.push(concept.concept_id_1);
  });

  const uniqueConceptIds = Array.from(
    new Set(includedConceptIds.concat(conceptIds))
  ).sort();
  return uniqueConceptIds;
};
