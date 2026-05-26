import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import {
  IWebApiConceptSetHeader,
  IWebApiConceptSetItemWrite,
  WebApiConceptSetAPI,
} from "../api/WebApiConceptSetAPI.ts";
import {
  IConceptSetListResponseDto,
  IConceptSetResponseDto,
  IConceptSetCreateDto,
  IConceptSetItemListDto,
  IConceptSetItemsResponseDto,
} from "../dto/conceptset.ts";
import {
  ITerminologyConceptSet,
  ITerminologyCreateConceptSet,
} from "../api/types.ts";
import { _getInvalidReasonFromCaption } from "./vocabulary.service.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { BookmarksAPI } from "../api/BookmarksAPI.ts";
import {
  ConceptSetInUseError,
  ConceptSetExpressionError,
  LegacyConceptSetReadOnlyError,
  ConceptSetValidationError,
} from "../errors/ConceptSetErrors.ts";
import { resolveSourceKey } from "./source.service.ts";

export const WEBAPI_CONCEPT_SET_ID_OFFSET = 1_000_000_000;
export const LEGACY_CONCEPT_SET_FORBIDDEN_MESSAGE =
  "Legacy concept sets are read-only. Create a new WebAPI concept set to make changes.";

export const encodeWebApiConceptSetId = (conceptSetId: number): number =>
  WEBAPI_CONCEPT_SET_ID_OFFSET + conceptSetId;

const decodeWebApiConceptSetId = (conceptSetId: number): number =>
  conceptSetId - WEBAPI_CONCEPT_SET_ID_OFFSET;

export const isWebApiConceptSetId = (conceptSetId: number): boolean =>
  conceptSetId >= WEBAPI_CONCEPT_SET_ID_OFFSET;

const mapItemsToTerminologyConcepts = (
  conceptSetItemList: IConceptSetItemListDto,
): ITerminologyCreateConceptSet["concepts"] => {
  return conceptSetItemList.map((conceptSetItem) => ({
    id: conceptSetItem.conceptId,
    useMapped: conceptSetItem.includeMapped,
    useDescendants: conceptSetItem.includeDescendants,
    isExcluded: conceptSetItem.isExcluded,
  }));
};

export const assertConceptSetWritable = (conceptSetId: number): void => {
  if (!isWebApiConceptSetId(conceptSetId)) {
    throw new LegacyConceptSetReadOnlyError(
      LEGACY_CONCEPT_SET_FORBIDDEN_MESSAGE,
    );
  }
};

export const getConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
): Promise<IConceptSetResponseDto> => {
  if (isWebApiConceptSetId(conceptSetId)) {
    const webApiConceptSetApi = new WebApiConceptSetAPI(token);
    const webApiConceptSet = await webApiConceptSetApi.getConceptSet(
      decodeWebApiConceptSetId(conceptSetId),
    );
    return mapWebApiConceptSetToFacadeConceptSet(webApiConceptSet);
  }

  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSet = await terminologySvcApi.getConceptSet(
    conceptSetId,
    datasetId,
  );

  return mapLegacyConceptSetToWebApiConceptSet(terminologyConceptSet);
};

export const getConceptSets = async (
  token: string,
  datasetId: string,
): Promise<IConceptSetListResponseDto> => {
  const terminologySvcApi = new TerminologySvcAPI(token);
  const webApiConceptSetApi = new WebApiConceptSetAPI(token);

  const [terminologyConceptSets, webApiConceptSets] = await Promise.all([
    terminologySvcApi.getConceptSets(datasetId),
    webApiConceptSetApi.getConceptSets().catch(() => []),
  ]);

  const merged = [
    ...terminologyConceptSets.map(mapLegacyConceptSetToWebApiConceptSet),
    ...webApiConceptSets.map(mapWebApiConceptSetToFacadeConceptSet),
  ];

  return merged;
};

export const createConceptSet = async (
  token: string,
  _datasetId: string,
  conceptSetDto: IConceptSetCreateDto,
): Promise<IConceptSetResponseDto> => {
  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  const webApiConceptSet = await webApiConceptSetApi.createConceptSet({
    name: conceptSetDto.name,
    description: conceptSetDto.description,
  });

  return mapWebApiConceptSetToFacadeConceptSet(webApiConceptSet);
};

export const updateConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetDto: IConceptSetCreateDto,
): Promise<boolean> => {
  if (!isWebApiConceptSetId(conceptSetId)) {
    const terminologySvcApi = new TerminologySvcAPI(token);
    const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
      datasetId,
      conceptSetId,
    );

    await terminologySvcApi.updateConceptSet(datasetId, conceptSetId, {
      concepts: terminologyConceptSet.concepts.map((concept) => ({
        id: concept.id,
        useMapped: concept.useMapped,
        useDescendants: concept.useDescendants,
        isExcluded: concept.isExcluded,
      })),
      name: conceptSetDto.name,
      shared: conceptSetDto.shared ?? false,
      userName: terminologyConceptSet.userName,
    });

    return true;
  }

  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  await webApiConceptSetApi.updateConceptSet(
    decodeWebApiConceptSetId(conceptSetId),
    {
      id: decodeWebApiConceptSetId(conceptSetId),
      name: conceptSetDto.name,
      description: conceptSetDto.description,
    },
  );

  return true;
};

export const deleteConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
): Promise<void> => {
  const resolvedConceptSetId = isWebApiConceptSetId(conceptSetId)
    ? decodeWebApiConceptSetId(conceptSetId)
    : conceptSetId;

  // Check if concept set is in use
  // Note: There is a potential race condition between this check and the deletion.
  // If another user adds a reference to the concept set between this check and the
  // actual deletion, the reference could become broken. This is an acceptable risk
  // for this feature, as the window is small and the impact is limited.
  const usage = await getConceptSetUsage(
    token,
    datasetId,
    resolvedConceptSetId,
  );

  if (usage.inUse) {
    throw new ConceptSetInUseError(usage.cohortDefinitions, usage.bookmarks);
  }

  // Proceed with deletion if not in use
  if (!isWebApiConceptSetId(conceptSetId)) {
    const terminologySvcApi = new TerminologySvcAPI(token);
    await terminologySvcApi.deleteConceptSet(datasetId, conceptSetId);
    return;
  }

  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  await webApiConceptSetApi.deleteConceptSet(resolvedConceptSetId);
};

export const getConceptSetUsage = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
): Promise<{
  inUse: boolean;
  cohortDefinitions: Array<{ id: number; name: string }>;
  bookmarks: Array<{ id: string; name: string }>;
}> => {
  // Validate concept set ID is a valid positive integer
  if (!Number.isInteger(conceptSetId) || conceptSetId <= 0) {
    throw new ConceptSetValidationError(
      `Invalid concept set ID: ${conceptSetId}. Must be a positive integer.`,
    );
  }

  const portalServerApi = new PortalServerAPI(token);
  const bookmarksApi = new BookmarksAPI(token);

  // Fetches all cohorts/bookmarks and filters in-memory; may need optimized APIs for large datasets.
  const [cohortDefinitions, bookmarksData] = await Promise.all([
    portalServerApi.getAtlasCohortDefinitionList(datasetId).catch((_error) => {
      // Wrap external API errors to avoid leaking internal implementation details
      throw new Error(
        "Failed to check cohort definitions for concept set usage",
      );
    }),
    bookmarksApi.getAllBookmarks(datasetId).catch((_error) => {
      // Wrap external API errors to avoid leaking internal implementation details
      throw new Error("Failed to check bookmarks for concept set usage");
    }),
  ]);

  // conceptSetId is validated as a positive integer above, safe to use in string matching
  const conceptSetIdStr = String(conceptSetId);

  const usingCohorts = cohortDefinitions.filter((cohort) => {
    const json = JSON.stringify(cohort.expression);
    // Check for CodesetId references in OHDSI Atlas JSON format
    // Matches "CodesetId":123} or "CodesetId":123, (with optional space after colon)
    // prevents 12 matching 123
    const patterns = [
      `"CodesetId":${conceptSetIdStr}}`,
      `"CodesetId":${conceptSetIdStr},`,
      `"CodesetId": ${conceptSetIdStr}}`,
      `"CodesetId": ${conceptSetIdStr},`,
    ];
    return patterns.some((pattern) => json.includes(pattern));
  });

  // Check Bookmarks (D2E filters) using string matching
  const bookmarks = bookmarksData.bookmarks || [];

  const usingBookmarks = bookmarks.filter((bookmark) => {
    const bookmarkJson = bookmark.bookmark;
    // Concept set ID is stored as "value":"869" in bookmark constraint expressions
    const patterns = [
      `"value":"${conceptSetIdStr}"`,
      `"value": "${conceptSetIdStr}"`,
    ];
    return patterns.some((pattern) => bookmarkJson.includes(pattern));
  });

  return {
    inUse: usingCohorts.length > 0 || usingBookmarks.length > 0,
    cohortDefinitions: usingCohorts.map((c) => ({ id: c.id, name: c.name })),
    bookmarks: usingBookmarks.map((b) => ({
      id: b.bmkId,
      name: b.bookmarkname,
    })),
  };
};

export const updateConceptSetItems = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetItemList: IConceptSetItemListDto,
): Promise<boolean> => {
  if (!isWebApiConceptSetId(conceptSetId)) {
    const terminologySvcApi = new TerminologySvcAPI(token);
    const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
      datasetId,
      conceptSetId,
    );

    await terminologySvcApi.updateConceptSet(datasetId, conceptSetId, {
      concepts: mapItemsToTerminologyConcepts(conceptSetItemList),
      name: terminologyConceptSet.name,
      shared: terminologyConceptSet.shared,
      userName: terminologyConceptSet.userName,
    });

    return true;
  }

  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  const items: IWebApiConceptSetItemWrite[] = conceptSetItemList.map(
    (conceptSetItem) => ({
      conceptId: conceptSetItem.conceptId,
      includeMapped: conceptSetItem.includeMapped,
      includeDescendants: conceptSetItem.includeDescendants,
      isExcluded: conceptSetItem.isExcluded,
    }),
  );

  await webApiConceptSetApi.updateConceptSetItems(
    decodeWebApiConceptSetId(conceptSetId),
    items,
  );

  return true;
};

export const getConceptSetExpression = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
): Promise<IConceptSetItemsResponseDto> => {
  if (isWebApiConceptSetId(conceptSetId)) {
    const webApiConceptSetApi = new WebApiConceptSetAPI(token);

    let sourceKey: string;
    try {
      sourceKey = await resolveSourceKey(token, datasetId);
    } catch (error) {
      console.error(
        `[ConceptSetExpression] Failed to resolve source key for dataset ${datasetId}`,
        error,
      );
      throw new ConceptSetExpressionError(
        `Failed to resolve source configuration for dataset ${datasetId}`,
      );
    }

    try {
      return await webApiConceptSetApi.getConceptSetExpression(
        decodeWebApiConceptSetId(conceptSetId),
        sourceKey,
      );
    } catch (error) {
      console.error(
        `[ConceptSetExpression] Failed to fetch expression for WebAPI concept set ${conceptSetId} using source key ${sourceKey}`,
        error,
      );
      throw new ConceptSetExpressionError(
        `Failed to fetch concept set expression for source ${sourceKey}`,
      );
    }
  }

  const terminologySvcApi = new TerminologySvcAPI(token);

  const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
    datasetId,
    conceptSetId,
  );

  // Map results to webapi format
  const webapiConceptSetItems: IConceptSetItemsResponseDto = {
    items: terminologyConceptSet.concepts.map((terminologyConcept) => {
      return {
        concept: {
          CONCEPT_ID: terminologyConcept.conceptId,
          CONCEPT_NAME: terminologyConcept.display,
          STANDARD_CONCEPT: terminologyConcept.standardConcept,
          STANDARD_CONCEPT_CAPTION: terminologyConcept.concept,
          INVALID_REASON: _getInvalidReasonFromCaption(
            terminologyConcept.validity,
          ),
          INVALID_REASON_CAPTION: terminologyConcept.validity,
          CONCEPT_CODE: terminologyConcept.code,
          DOMAIN_ID: terminologyConcept.domainId,
          VOCABULARY_ID: terminologyConcept.vocabularyId,
          CONCEPT_CLASS_ID: terminologyConcept.conceptClassId,
          VALID_START_DATE: terminologyConcept.validStartDate,
          VALID_END_DATE: terminologyConcept.validEndDate,
        },
        includeDescendants: terminologyConcept.useDescendants,
        includeMapped: terminologyConcept.useMapped,
        isExcluded: terminologyConcept.isExcluded,
      };
    }),
  };
  return webapiConceptSetItems;
};

export const checkIfConceptSetExists = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetName: string,
): Promise<number> => {
  const terminologySvcApi = new TerminologySvcAPI(token);
  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  const [terminologyConceptSets, webApiExistsCount] = await Promise.all([
    terminologySvcApi.getConceptSets(datasetId),
    webApiConceptSetApi
      .checkIfConceptSetExists(
        isWebApiConceptSetId(conceptSetId)
          ? decodeWebApiConceptSetId(conceptSetId)
          : 0,
        conceptSetName,
      )
      .catch(() => 0),
  ]);

  const result = terminologyConceptSets.find(
    (terminologyConceptSet) =>
      terminologyConceptSet.id !== conceptSetId &&
      terminologyConceptSet.name === conceptSetName,
  );

  return (result === undefined ? 0 : 1) + webApiExistsCount;
};

export const mapLegacyConceptSetToWebApiConceptSet = (
  conceptSet: ITerminologyConceptSet,
): IConceptSetResponseDto => {
  return {
    createdDate: Date.parse(conceptSet.createdDate),
    createdBy: {
      name: conceptSet.userName,
    },
    modifiedDate: Date.parse(conceptSet.modifiedDate),
    modifiedBy: {
      name: conceptSet.userName,
    },
    tags: [],
    hasWriteAccess: true,
    hasReadAccess: true,
    id: conceptSet.id,
    name: conceptSet.name,
    shared: conceptSet.shared,
    source: "legacy",
  };
};

export const mapWebApiConceptSetToFacadeConceptSet = (
  conceptSet: IWebApiConceptSetHeader,
): IConceptSetResponseDto => {
  return {
    createdDate: conceptSet.createdDate ?? Date.now(),
    createdBy: {
      name: conceptSet.createdBy?.name ?? "unknown",
      id: conceptSet.createdBy?.id,
      login: conceptSet.createdBy?.login,
    },
    modifiedDate: conceptSet.modifiedDate ?? Date.now(),
    modifiedBy: {
      name: conceptSet.modifiedBy?.name ?? "unknown",
      id: conceptSet.modifiedBy?.id,
      login: conceptSet.modifiedBy?.login,
    },
    tags: conceptSet.tags ?? [],
    hasWriteAccess: conceptSet.writeAccess ?? true,
    hasReadAccess: conceptSet.readAccess ?? true,
    id: encodeWebApiConceptSetId(conceptSet.id),
    name: conceptSet.name,
    shared: false,
    description: conceptSet.description ?? undefined,
    source: "webapi",
  };
};
