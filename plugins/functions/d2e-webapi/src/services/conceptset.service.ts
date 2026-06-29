import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import {
  IWebApiConcept,
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
import { getConceptsFromIdentifiers } from "./vocabulary.service.ts";
import {
  ConceptSetRef,
  CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
  formatConceptSetRef,
  parseConceptSetRef,
} from "../utils/conceptSetRef.ts";
import { IIncludedConcept } from "../dto/conceptset.ts";

const buildConceptSetIdValues = (
  ref: ConceptSetRef,
): Set<string | number> => {
  const values = new Set<string | number>();
  values.add(formatConceptSetRef(ref));
  if (ref.source === "legacy") {
    values.add(ref.externalId);
    values.add(String(ref.externalId));
  } else {
    const offsetId = ref.externalId + CONCEPT_SET_LEGACY_OFFSET_BOUNDARY;
    values.add(offsetId);
    values.add(String(offsetId));
  }
  return values;
};

const bookmarkUsesConceptSet = (
  bookmark: unknown,
  matchingValues: Set<string | number>,
): boolean => {
  if (typeof bookmark !== "object" || bookmark === null) {
    return false;
  }

  if (Array.isArray(bookmark)) {
    return bookmark.some((item) =>
      bookmarkUsesConceptSet(item, matchingValues)
    );
  }

  for (const [key, value] of Object.entries(bookmark)) {
    if (key === "value" && matchingValues.has(value)) {
      return true;
    }
    if (typeof value === "object" && value !== null) {
      if (bookmarkUsesConceptSet(value, matchingValues)) {
        return true;
      }
    }
  }

  return false;
};

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
    webApiConceptSetApi.getConceptSets(),
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
  // Pass the original unparsed conceptSetId so getConceptSetUsage performs its
  // own single parse. Forwarding ref.externalId here would re-enter the parser
  // and could mis-classify a webapi externalId < 1_000_000_000 as legacy.
  const usage = await getConceptSetUsage(token, datasetId, conceptSetId);

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
  let ref: ConceptSetRef;
  try {
    ref = parseConceptSetRef(conceptSetId);
  } catch (error) {
    // The parser's own message already embeds the raw input via JSON.stringify,
    // so we rethrow it as-is rather than prefixing a second copy of the input.
    throw new ConceptSetValidationError(
      error instanceof Error ? error.message : String(error),
    );
  }

  // Defence against conceptSetId 0 false-positives in the matchers below.
  // (parseConceptSetRef already enforces non-negative integer; this rejects the legitimate
  //  parsed-but-unusable id 0 specifically.)
  if (ref.externalId <= 0) {
    throw new ConceptSetValidationError(
      `Invalid concept set ID: ${String(conceptSetId)}. Concept set ID 0 is reserved.`,
    );
  }

  const matchingValues = buildConceptSetIdValues(ref);

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

  const usingCohorts = cohortDefinitions.filter((cohort) => {
    const conceptSets =
      (cohort.expression as Record<string, unknown>)?.ConceptSets;
    if (!Array.isArray(conceptSets)) {
      return false;
    }
    return conceptSets.some((conceptSet) => {
      const id = (conceptSet as Record<string, unknown>)?.conceptSetId;
      return matchingValues.has(id as string | number) ||
        matchingValues.has(String(id));
    });
  });

  // Check Bookmarks (D2E filters) using exact value comparison
  const bookmarks = bookmarksData.bookmarks || [];

  const usingBookmarks = bookmarks.filter((bookmark) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bookmark.bookmark);
    } catch {
      return false;
    }
    return bookmarkUsesConceptSet(parsed, matchingValues);
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
    webApiConceptSetApi.checkIfConceptSetExists(webApiExcludeId, conceptSetName),
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

const parseDateValue = (value: string | number): number => {
  if (typeof value === "number") {
    return value;
  }
  return Date.parse(value);
};

const mapWebApiConceptToIncludedConcept = (
  concept: IWebApiConcept,
  flags: { useMapped: boolean; useDescendants: boolean }
): IIncludedConcept => ({
  CONCEPT_ID: concept.CONCEPT_ID,
  CONCEPT_NAME: concept.CONCEPT_NAME,
  DOMAIN_ID: concept.DOMAIN_ID,
  VOCABULARY_ID: concept.VOCABULARY_ID,
  CONCEPT_CLASS_ID: concept.CONCEPT_CLASS_ID,
  STANDARD_CONCEPT: concept.STANDARD_CONCEPT,
  CONCEPT_CODE: concept.CONCEPT_CODE,
  VALID_START_DATE: parseDateValue(concept.VALID_START_DATE),
  VALID_END_DATE: parseDateValue(concept.VALID_END_DATE),
  INVALID_REASON: concept.INVALID_REASON,
  USEMAPPED: flags.useMapped,
  USEDESCENDANTS: flags.useDescendants,
});

const mapLegacyConceptToIncludedConcept = (
  concept: {
    conceptId: number;
    display: string;
    domainId: string;
    system: string;
    conceptClassId: string;
    standardConcept: string;
    code: string;
    validStartDate: string;
    validEndDate: string;
    validity: string;
    useMapped: boolean;
    useDescendants: boolean;
  }
): IIncludedConcept => ({
  CONCEPT_ID: concept.conceptId,
  CONCEPT_NAME: concept.display,
  DOMAIN_ID: concept.domainId,
  VOCABULARY_ID: concept.system,
  CONCEPT_CLASS_ID: concept.conceptClassId,
  STANDARD_CONCEPT: concept.standardConcept,
  CONCEPT_CODE: concept.code,
  VALID_START_DATE: Date.parse(concept.validStartDate),
  VALID_END_DATE: Date.parse(concept.validEndDate),
  INVALID_REASON: concept.validity,
  USEMAPPED: concept.useMapped,
  USEDESCENDANTS: concept.useDescendants,
});

const getLegacyIncludedConcepts = async (
  token: string,
  datasetId: string,
  externalIds: number[]
): Promise<IIncludedConcept[]> => {
  if (externalIds.length === 0) {
    return [];
  }

  const terminologySvcApi = new TerminologySvcAPI(token);
  const conceptSets = await Promise.all(
    externalIds.map((id) => terminologySvcApi.getConceptSetById(datasetId, id))
  );

  const resolvedIds = await Promise.all(
    conceptSets.map((conceptSet) =>
      terminologySvcApi.resolveConceptSetExpression(
        datasetId,
        conceptSet.concepts.map((concept) => ({
          id: concept.id,
          useMapped: concept.useMapped,
          useDescendants: concept.useDescendants,
          isExcluded: concept.isExcluded,
        }))
      )
    )
  );

  const allResolvedIds = Array.from(new Set(resolvedIds.flat()));
  const conceptDetails = allResolvedIds.length > 0
    ? await getConceptsFromIdentifiers(token, datasetId, allResolvedIds)
    : [];

  const result: IIncludedConcept[] = [];
  const seen = new Set<number>();

  for (const conceptSet of conceptSets) {
    const conceptFlagMap = new Map(
      conceptSet.concepts.map((concept) => [
        concept.id,
        { useMapped: concept.useMapped, useDescendants: concept.useDescendants },
      ])
    );

    for (const resolvedId of resolvedIds[conceptSets.indexOf(conceptSet)]) {
      if (seen.has(resolvedId)) {
        continue;
      }
      seen.add(resolvedId);

      const directConcept = conceptSet.concepts.find((c) => c.id === resolvedId);
      if (directConcept) {
        result.push(mapLegacyConceptToIncludedConcept(directConcept));
        continue;
      }

      const detail = conceptDetails.find((c) => c.CONCEPT_ID === resolvedId);
      if (detail) {
        result.push({
          ...detail,
          VALID_START_DATE: parseDateValue(detail.VALID_START_DATE),
          VALID_END_DATE: parseDateValue(detail.VALID_END_DATE),
          USEMAPPED: false,
          USEDESCENDANTS: false,
        });
      }
    }
  }

  return result;
};

const getWebApiIncludedConcepts = async (
  token: string,
  datasetId: string,
  externalIds: number[]
): Promise<IIncludedConcept[]> => {
  if (externalIds.length === 0) {
    return [];
  }

  let sourceKey: string;
  try {
    sourceKey = await resolveSourceKey(token, datasetId);
  } catch (error) {
    console.error(
      `[getIncludedConcepts] Failed to resolve source key for dataset ${datasetId}`,
      error,
    );
    throw new ConceptSetExpressionError(
      `Failed to resolve source configuration for dataset ${datasetId}`,
    );
  }

  const webApiConceptSetApi = new WebApiConceptSetAPI(token);

  const expressions = await Promise.all(
    externalIds.map((id) =>
      webApiConceptSetApi.getConceptSetExpression(id, sourceKey)
    )
  );

  const resolvedIds = await Promise.all(
    expressions.map((expression) =>
      webApiConceptSetApi.resolveConceptSetExpression(sourceKey, expression)
    )
  );

  const allResolvedIds = Array.from(new Set(resolvedIds.flat()));
  const conceptDetails = allResolvedIds.length > 0
    ? await webApiConceptSetApi.lookupIdentifiers(sourceKey, allResolvedIds)
    : [];

  const result: IIncludedConcept[] = [];
  const seen = new Set<number>();

  for (const expression of expressions) {
    const expressionFlagMap = new Map(
      expression.items.map((item) => [
        item.concept.CONCEPT_ID,
        { useMapped: item.includeMapped, useDescendants: item.includeDescendants },
      ])
    );

    const resolvedIdList = resolvedIds[expressions.indexOf(expression)];
    for (const resolvedId of resolvedIdList) {
      if (seen.has(resolvedId)) {
        continue;
      }
      seen.add(resolvedId);

      const expressionItem = expression.items.find(
        (item) => item.concept.CONCEPT_ID === resolvedId
      );
      if (expressionItem) {
        result.push(
          mapWebApiConceptToIncludedConcept(expressionItem.concept, {
            useMapped: expressionItem.includeMapped,
            useDescendants: expressionItem.includeDescendants,
          })
        );
        continue;
      }

      const detail = conceptDetails.find((c) => c.CONCEPT_ID === resolvedId);
      if (detail) {
        const flags = expressionFlagMap.get(resolvedId) ?? {
          useMapped: false,
          useDescendants: false,
        };
        result.push(mapWebApiConceptToIncludedConcept(detail, flags));
      }
    }
  }

  return result;
};

export const getIncludedConcepts = async (
  token: string,
  datasetId: string,
  conceptSetIds: string[],
): Promise<IIncludedConcept[]> => {
  const refs = conceptSetIds.map((id) => parseConceptSetRef(id));
  const legacyRefs = refs.filter((r) => r.source === "legacy");
  const webapiRefs = refs.filter((r) => r.source === "webapi");

  const [legacyConcepts, webapiConcepts] = await Promise.all([
    legacyRefs.length > 0
      ? getLegacyIncludedConcepts(
        token,
        datasetId,
        legacyRefs.map((r) => r.externalId),
      )
      : Promise.resolve([]),
    webapiRefs.length > 0
      ? getWebApiIncludedConcepts(
        token,
        datasetId,
        webapiRefs.map((r) => r.externalId),
      )
      : Promise.resolve([]),
  ]);

  const seen = new Set<number>();
  const result: IIncludedConcept[] = [];
  for (const concept of [...legacyConcepts, ...webapiConcepts]) {
    if (!seen.has(concept.CONCEPT_ID)) {
      seen.add(concept.CONCEPT_ID);
      result.push(concept);
    }
  }
  return result;
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
