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
  ConceptSetValidationError,
} from "../errors/ConceptSetErrors.ts";
import { resolveSourceKey } from "./source.service.ts";
import {
  formatConceptSetRef,
  parseConceptSetRef,
} from "../utils/conceptSetRef.ts";

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

export const getConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: string | number,
): Promise<IConceptSetResponseDto> => {
  const ref = parseConceptSetRef(conceptSetId);

  if (ref.source === "webapi") {
    const webApiConceptSetApi = new WebApiConceptSetAPI(token);
    const webApiConceptSet = await webApiConceptSetApi.getConceptSet(
      ref.externalId,
    );
    return mapWebApiConceptSetToFacadeConceptSet(webApiConceptSet);
  }

  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSet = await terminologySvcApi.getConceptSet(
    ref.externalId,
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
  conceptSetId: string | number,
  conceptSetDto: IConceptSetCreateDto,
): Promise<boolean> => {
  const ref = parseConceptSetRef(conceptSetId);

  if (ref.source === "legacy") {
    const terminologySvcApi = new TerminologySvcAPI(token);
    const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
      datasetId,
      ref.externalId,
    );

    await terminologySvcApi.updateConceptSet(datasetId, ref.externalId, {
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
  await webApiConceptSetApi.updateConceptSet(ref.externalId, {
    id: ref.externalId,
    name: conceptSetDto.name,
    description: conceptSetDto.description,
  });

  return true;
};

export const deleteConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: string | number,
): Promise<void> => {
  const ref = parseConceptSetRef(conceptSetId);

  // Check if concept set is in use
  // Note: There is a potential race condition between this check and the deletion.
  // If another user adds a reference to the concept set between this check and the
  // actual deletion, the reference could become broken. This is an acceptable risk
  // for this feature, as the window is small and the impact is limited.
  const usage = await getConceptSetUsage(token, datasetId, ref.externalId);

  if (usage.inUse) {
    throw new ConceptSetInUseError(usage.cohortDefinitions, usage.bookmarks);
  }

  // Proceed with deletion if not in use
  if (ref.source === "legacy") {
    const terminologySvcApi = new TerminologySvcAPI(token);
    await terminologySvcApi.deleteConceptSet(datasetId, ref.externalId);
    return;
  }

  const webApiConceptSetApi = new WebApiConceptSetAPI(token);
  await webApiConceptSetApi.deleteConceptSet(ref.externalId);
};

export const getConceptSetUsage = async (
  token: string,
  datasetId: string,
  conceptSetId: string | number,
): Promise<{
  inUse: boolean;
  cohortDefinitions: Array<{ id: number; name: string }>;
  bookmarks: Array<{ id: string; name: string }>;
}> => {
  // Parse the input via the shared parser; accept compound or bare numeric.
  // The parser guarantees a non-negative integer externalId, which is what
  // the JSON pattern matchers below need.
  let externalId: number;
  try {
    externalId = parseConceptSetRef(conceptSetId).externalId;
  } catch (error) {
    throw new ConceptSetValidationError(
      `Invalid concept set ID: ${String(conceptSetId)}. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (externalId <= 0) {
    throw new ConceptSetValidationError(
      `Invalid concept set ID: ${String(conceptSetId)}. Must be a positive integer.`,
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

  // externalId is guaranteed a non-negative integer; safe for string matching.
  const conceptSetIdStr = String(externalId);

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
  conceptSetId: string | number,
  conceptSetItemList: IConceptSetItemListDto,
): Promise<boolean> => {
  const ref = parseConceptSetRef(conceptSetId);

  if (ref.source === "legacy") {
    const terminologySvcApi = new TerminologySvcAPI(token);
    const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
      datasetId,
      ref.externalId,
    );

    await terminologySvcApi.updateConceptSet(datasetId, ref.externalId, {
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

  await webApiConceptSetApi.updateConceptSetItems(ref.externalId, items);

  return true;
};

export const getConceptSetExpression = async (
  token: string,
  datasetId: string,
  conceptSetId: string | number,
): Promise<IConceptSetItemsResponseDto> => {
  const ref = parseConceptSetRef(conceptSetId);

  if (ref.source === "webapi") {
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
        ref.externalId,
        sourceKey,
      );
    } catch (error) {
      console.error(
        `[ConceptSetExpression] Failed to fetch expression for WebAPI concept set ${ref.externalId} using source key ${sourceKey}`,
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
    ref.externalId,
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
  conceptSetId: string | number,
  conceptSetName: string,
): Promise<number> => {
  const ref = parseConceptSetRef(conceptSetId);
  const terminologySvcApi = new TerminologySvcAPI(token);
  const webApiConceptSetApi = new WebApiConceptSetAPI(token);

  // Probe WebAPI with the source-scoped externalId so that an in-flight
  // rename of the same row doesn't false-positive against itself. For
  // legacy refs there is no WebAPI counterpart to exclude, so use 0 (a
  // never-existing id) which still surfaces unrelated WebAPI duplicates.
  const webApiExcludeId = ref.source === "webapi" ? ref.externalId : 0;

  const [terminologyConceptSets, webApiExistsCount] = await Promise.all([
    terminologySvcApi.getConceptSets(datasetId),
    webApiConceptSetApi
      .checkIfConceptSetExists(webApiExcludeId, conceptSetName)
      .catch(() => 0),
  ]);

  // For legacy refs we must exclude the same legacy row by id; for webapi
  // refs the legacy table is a disjoint namespace, so no row should match
  // the externalId (matching here would be a separate legacy row that
  // happens to share the name and is still a duplicate to surface).
  const result = terminologyConceptSets.find((terminologyConceptSet) =>
    ref.source === "legacy"
      ? terminologyConceptSet.id !== ref.externalId &&
        terminologyConceptSet.name === conceptSetName
      : terminologyConceptSet.name === conceptSetName,
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
    id: formatConceptSetRef({ source: "legacy", externalId: conceptSet.id }),
    externalId: conceptSet.id,
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
    id: formatConceptSetRef({ source: "webapi", externalId: conceptSet.id }),
    externalId: conceptSet.id,
    name: conceptSet.name,
    shared: false,
    description: conceptSet.description ?? undefined,
    source: "webapi",
  };
};
