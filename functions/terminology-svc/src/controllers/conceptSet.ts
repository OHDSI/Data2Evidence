// @ts-types="npm:@types/express"
import { NextFunction, Response, Request } from "express";
import { SystemPortalAPI } from "../api/portal-api.ts";
import { JwtPayload, decode } from "jsonwebtoken";
import * as schemas from "./validators/conceptSetSchemas.ts";
import { CachedbService } from "../services/cachedb.ts";

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
    const systemPortalApi = new SystemPortalAPI(req);
    const conceptSet = await systemPortalApi.getConceptSetById(
      params.conceptSetId,
      query.datasetId
    );
    const conceptIds = conceptSet.concepts.map((c) => c.id);
    const cachedbService = new CachedbService(req);
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
    const { body } = schemas.getIncludedConcepts.parse(req);

    const { conceptSetIds, datasetId } = body;

    const systemPortalApi = new SystemPortalAPI(req);
    const datasetDB = { ...(await systemPortalApi.getDatasetDetails(datasetId)), datasetId }
    const cachedbService = new CachedbService(req, datasetDB);

    const promises = conceptSetIds.map(async (conceptSetId) => {
      const conceptSet = await systemPortalApi.getConceptSetById(
        conceptSetId,
        datasetId
      );
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

    const conceptIds: number[] = [];
    const conceptIdsToIncludeDescendant: number[] = [];
    const conceptIdsToIncludeMapped: number[] = [];
    const conceptIdsToIncludeMappedAndDescendant: number[] = [];

    conceptSets.forEach((conceptSet) => {
      conceptSet.concepts.forEach((concept) => {
        if (!concept.id) {
          return;
        }
        conceptIds.push(concept.id);
        if (concept.useDescendants) {
          conceptIdsToIncludeDescendant.push(concept.id);
        }
        if (concept.useMapped) {
          conceptIdsToIncludeMapped.push(concept.id);
          if (concept.useDescendants) {
            conceptIdsToIncludeMappedAndDescendant.push(concept.id);
          }
        }
      });
    });

    if (conceptIds.length === 0) {
      res.send([]);
      return;
    }

    const uniqueConceptIds = await _getConceptSetConceptIds(
      req,
      datasetId,
      conceptIds,
      conceptIdsToIncludeDescendant,
      conceptIdsToIncludeMapped,
      conceptIdsToIncludeMappedAndDescendant,
      cachedbService
    );
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

    const systemPortalApi = new SystemPortalAPI(req);
    const datasetDB = { ...(await systemPortalApi.getDatasetDetails(datasetId)), datasetId }
    const cachedbService = new CachedbService(req, datasetDB);

    const conceptIds: number[] = [];
    const conceptIdsToIncludeDescendant: number[] = [];
    const conceptIdsToIncludeMapped: number[] = [];
    const conceptIdsToIncludeMappedAndDescendant: number[] = [];

    concepts.forEach((concept) => {
      if (!concept.id) {
        return;
      }
      conceptIds.push(concept.id);
      if (concept.useDescendants) {
        conceptIdsToIncludeDescendant.push(concept.id);
      }
      if (concept.useMapped) {
        conceptIdsToIncludeMapped.push(concept.id);
        if (concept.useDescendants) {
          conceptIdsToIncludeMappedAndDescendant.push(concept.id);
        }
      }
    });

    if (conceptIds.length === 0) {
      res.send([]);
      return;
    }

    const uniqueConceptIds = await _getConceptSetConceptIds(
      req,
      datasetId,
      conceptIds,
      conceptIdsToIncludeDescendant,
      conceptIdsToIncludeMapped,
      conceptIdsToIncludeMappedAndDescendant,
      cachedbService
    );
    res.send(uniqueConceptIds);
  } catch (e) {
    console.error("Error resolving concept set expression for concepts!");
    next(e);
  }
};

const _getConceptSetConceptIds = async (
  req: Request,
  datasetId: string,
  conceptIds: number[],
  conceptIdsToIncludeDescendant: number[],
  conceptIdsToIncludeMapped: number[],
  conceptIdsToIncludeMappedAndDescendant: number[],
  cachedbService: CachedbDAO | HanaHDBDao
): Promise<number[]> => {

  const includedConceptIds = await cachedbService.getConceptsAndDescendantIds(
    conceptIds,
    conceptIdsToIncludeDescendant,
    datasetId
  );
  const mappedConceptsAndDescendantIds =
    await cachedbService.getConceptsAndDescendantIds(
      conceptIdsToIncludeMapped,
      conceptIdsToIncludeMappedAndDescendant,
      datasetId
    );

  const mappedConceptIds = await cachedbService.getConceptRelationshipMapsTo(
    mappedConceptsAndDescendantIds,
    datasetId
  );
  
  mappedConceptIds.forEach((concept) => {
    includedConceptIds.push(concept.concept_id_1);
  });

  const uniqueConceptIds = Array.from(new Set(includedConceptIds.concat(conceptIds))).sort();
  return uniqueConceptIds;
};
