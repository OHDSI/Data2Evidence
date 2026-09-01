import { z } from "zod";

import {
  IBookmark,
  ICohortDefinition,
  ICohortGeneratorFlowRun,
  ICombinedCohortDefnitionListItem,
  IMaterializedCohort,
  IBaseMaterializedCohort,
  ICohortCacheLookupResponse,
  ICohortCacheWriteEntry,
} from "../api/types.ts";
import { AnalyticsSvcAPI } from "../api/AnalyticsAPI.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { WebAPIAPI } from "../api/WebAPIAPI.ts";
import { BookmarksAPI } from "../api/BookmarksAPI.ts";
import {
  AtlasCohortDefinitionDto,
  IGenerateCohortResponseDto,
  ICohortDefinitionCheckV2ResponseDto,
  IWebAPICohortDefinitionResponseDto,
} from "../dto/cohortdefinition.ts";
import { IWebAPICohortDefinition } from "../api/WebAPIAPI.ts";
import { BookmarksSchema } from "../api/types.ts";
import { ICohortExpression } from "../types.ts";
import { TrexDAO } from "../dao/trex.dao.ts";
import { CohortCacheShapeError } from "../errors/CohortCacheErrors.ts";

const MATERIALIZED_COHORT_RETRY_ATTEMPTS = 5;
const MATERIALIZED_COHORT_RETRY_DELAYS_MS = [500, 1000, 1500, 2000];

const delay = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

const withRetry = async <T>(
  operation: () => Promise<T>,
  delaysMs: number[],
): Promise<T> => {
  for (let attemptIndex = 0; attemptIndex <= delaysMs.length; attemptIndex++) {
    try {
      return await operation();
    } catch (error) {
      const nextDelayMs = delaysMs[attemptIndex];
      if (nextDelayMs === undefined) {
        throw error;
      }
      await delay(nextDelayMs);
    }
  }

  throw new Error("Retry operation failed without an error");
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
      response?: { status?: unknown; data?: unknown };
    };

    return {
      message:
        typeof apiError.message === "string" ? apiError.message : String(error),
      status: apiError.status ?? apiError.response?.status,
      code: apiError.code,
      responseData: apiError.response?.data,
    };
  }

  return {
    message: String(error),
  };
};

const parseExpressionToJson = (
  expression: ICohortExpression | string,
): ICohortExpression => {
  if (typeof expression !== "string") {
    return expression;
  }

  const parsedExpression = JSON.parse(expression);
  if (
    typeof parsedExpression !== "object" ||
    parsedExpression === null ||
    Array.isArray(parsedExpression)
  ) {
    throw new Error("Parsed cohort expression was not a JSON object");
  }

  return parsedExpression as ICohortExpression;
};

const normalizeCohortDefinitionExpression = (
  cohortDefinition: IWebAPICohortDefinition,
): IWebAPICohortDefinitionResponseDto => ({
  ...cohortDefinition,
  expression: parseExpressionToJson(cohortDefinition.expression),
});

export const generateCohort = async (
  token: string,
  datasetId: string,
  atlasCohortDefinitionId: number,
) => {
  const portalServerApi = new PortalServerAPI(token);
  // Get dataset
  const dataset = await portalServerApi.getStudy(datasetId);
  const { databaseCode, schemaName, vocabSchemaName, resultsSchemaName } =
    dataset;
  const cacheId = dataset.cacheId ?? dataset.databaseCode;

  // Get atlas cohort definition from WebAPI via cohort definition id
  const webApiApi = new WebAPIAPI(token);
  const webApiCohortDefinition = await webApiApi.getCohortDefinition(
    atlasCohortDefinitionId,
  );
  const { name, description, expressionType } = webApiCohortDefinition;
  const tags = (webApiCohortDefinition.tags ?? [])
    .map((tag) => (typeof tag === "string" ? tag : tag.name))
    .filter((tag): tag is string => tag.length > 0);
  const expression = parseExpressionToJson(webApiCohortDefinition.expression);

  // If cohortJson expression has any CRITICAL warnings, reject cohort generation
  const cohortJsonValidation = await checkV2(token, datasetId, expression);
  if (cohortJsonValidation.warnings.some((e) => e.severity === "CRITICAL")) {
    throw new Error("Cohort expression has critical warnings");
  }

  // Construct response into OMOP cohort definition format
  const cohortDefinitionData: ICohortDefinition = {
    name,
    description,
    syntax: {
      atlasCohortDefinitionId,
      datasetId,
      expressionType,
      expression,
      tags,
    },
  };
  // Materialize cohort definition into cdm schema
  const analyticsSvcApi = new AnalyticsSvcAPI(token);
  const cdmCohortDefinitionId = await analyticsSvcApi.createCohortDefinition(
    datasetId,
    cohortDefinitionData,
  );
  // Get cohort definition via cdm cohort definition id
  const analyticsCohortDefinition = await new AnalyticsSvcAPI(
    token,
  ).getCohortDefinition(datasetId, cdmCohortDefinitionId);

  const cohortGeneratorFlowRun: ICohortGeneratorFlowRun = {
    datasetId,
    databaseCode,
    cacheId,
    schemaName,
    resultsSchemaName,
    vocabSchemaName,
    cohortDefinitionId: cdmCohortDefinitionId,
    description: description ?? "",
    cohortJson: {
      id: cdmCohortDefinitionId,
      name,
      createdDate: Date.parse(analyticsCohortDefinition.COHORT_INITIATION_DATE),
      modifiedDate: Date.parse(
        analyticsCohortDefinition.COHORT_INITIATION_DATE,
      ),
      hasWriteAccess: true, // Not used by flow
      tags: [],
      expressionType,
      expression,
    },
  };

  const flowRunId = await new JobPluginsAPI(token).createCohortGeneratorFlowRun(
    cohortGeneratorFlowRun,
  );

  const result: IGenerateCohortResponseDto = {
    status: "STARTING",
    startDate: null,
    endDate: null,
    exitStatus: "UNKNOWN",
    executionId: flowRunId,
    jobInstance: {
      instanceId: flowRunId,
      name: "generateCohort",
    },
    jobParameters: {
      jobName: `Generate Cohort ${analyticsCohortDefinition.COHORT_DEFINITION_NAME}`,
      generate_stats: "true",
      jobAuthor: "NA", // Not applicable
      sessionId: "NA", // Not applicable
      cohort_definition_id: analyticsCohortDefinition.COHORT_DEFINITION_ID,
      source_id: "-1", // Not applicable
      time: new Date().getTime(),
      target_database_schema: schemaName,
    },
    ownerType: null,
  };
  return result;
};

export const createCohortDefinition = async (
  token: string,
  _datasetId: string,
  cohortDefinitionDto: z.infer<typeof AtlasCohortDefinitionDto>,
) => {
  const webApiApi = new WebAPIAPI(token);
  const cohortDefinition =
    await webApiApi.createCohortDefinition(cohortDefinitionDto);
  return normalizeCohortDefinitionExpression(cohortDefinition);
};

export const getCohortDefinitionList = async (
  token: string,
  datasetId: string,
): Promise<ICombinedCohortDefnitionListItem[]> => {
  const bookmarksApi = new BookmarksAPI(token);
  const analyticsSvcAPI = new AnalyticsSvcAPI(token);
  const materializedCohortFetchStartedAt = Date.now();

  const [rawDataFromBookmarks, canMaterializeCohort] = await Promise.all([
    bookmarksApi.getAllBookmarks(datasetId).catch((error) => {
      console.error(
        "Failed to fetch bookmarks, continuing with empty list:",
        error,
      );
      return { bookmarks: [] as IBookmark[], schemaName: "" };
    }),
    withRetry(
      () => analyticsSvcAPI.canMaterializeCohort(datasetId),
      MATERIALIZED_COHORT_RETRY_DELAYS_MS,
    ).catch((error) => {
      console.error(
        "Failed to check whether cohort can be materialized after retries:",
        {
          datasetId,
          attempts: MATERIALIZED_COHORT_RETRY_ATTEMPTS,
          elapsedMs: Date.now() - materializedCohortFetchStartedAt,
          error: getErrorDetails(error),
        },
      );
      throw error;
    }),
  ]);

  // Parse bookmarks
  const bookmarksParse = BookmarksSchema.safeParse(rawDataFromBookmarks);
  if (!bookmarksParse.success) {
    console.error(
      "BookmarksSchema parse failed, continuing with empty bookmarks:",
      bookmarksParse.error,
    );
  }
  const parsedbookmarks = bookmarksParse.success
    ? bookmarksParse.data.bookmarks
    : [];

  // Return early if dataset cannot materialize cohorts
  if (!canMaterializeCohort) {
    return parsedbookmarks.map((bookmark) => ({
      ...bookmark,
      cohortDefinitionId: undefined as number | undefined,
    }));
  }

  // If every bookmark is a cache hit there is nothing left that needs the source-database query.
  const bookmarkIds = parsedbookmarks.map((bookmark) => bookmark.bmkId);

  const cacheRead = await _readCohortCache(
    analyticsSvcAPI,
    datasetId,
    bookmarkIds,
  );

  let baseMaterializedCohorts: IBaseMaterializedCohort[];
  let shouldWriteCohortCache = false;

  if (cacheRead.status === CohortCacheReadStatus.HIT) {
    baseMaterializedCohorts = cacheRead.cohorts;
  } else {
    // Miss (or an unusable cache): recompute from the authoritative source, ignore whatever partial cache read returned.
    const result = await withRetry(
      () => analyticsSvcAPI.getFilteredCohorts(datasetId, { datasetId }),
      MATERIALIZED_COHORT_RETRY_DELAYS_MS,
    ).catch((error) => {
      console.error("Failed to fetch materialized cohorts after retries:", {
        datasetId,
        attempts: MATERIALIZED_COHORT_RETRY_ATTEMPTS,
        elapsedMs: Date.now() - materializedCohortFetchStartedAt,
        error: getErrorDetails(error),
      });
      throw error;
    });

    if (!Array.isArray(result)) {
      throw new Error("Filtered cohorts response was not an array");
    }

    baseMaterializedCohorts = result;
    shouldWriteCohortCache = cacheRead.status === CohortCacheReadStatus.MISS;
  }

  // Create mapping for materialized cohorts to bookmarks
  const bookmarkIdToCohortId = new Map<string, number>();

  // Sort baseMaterializedCohorts so that the latest materialized cohort is matched with the corresponding bookmark
  baseMaterializedCohorts.sort((a, b) => a.id - b.id);
  for (const cohort of baseMaterializedCohorts) {
    let syntax: { bookmarkId?: string };
    try {
      syntax = JSON.parse(cohort.syntax);
    } catch (error) {
      console.error(
        `Failed to parse syntax for materialized cohort ${cohort.id}, skipping:`,
        error,
      );
      continue;
    }
    if (syntax.bookmarkId !== undefined) {
      bookmarkIdToCohortId.set(syntax.bookmarkId, cohort.id);
    }
  }

  // Add cohortDefinitionId to bookmarks if there is a respective materialized cohort
  const bookmarksWithId = parsedbookmarks.map((bookmark) => ({
    ...bookmark,
    cohortDefinitionId: bookmarkIdToCohortId.get(bookmark.bmkId),
  }));

  if (shouldWriteCohortCache) {
    // Fire and forget: never awaited before the response. A write lost to a
    // restart or a failing endpoint just means a miss on the next load.
    _writeCohortCacheEntries(
      analyticsSvcAPI,
      datasetId,
      bookmarksWithId,
      baseMaterializedCohorts,
    );
  }

  // Parse and filter materialized cohorts
  const formattedMaterializedCohorts = baseMaterializedCohorts.map((cohort) =>
    _formatMaterializedCohort(cohort),
  );
  // Filter out materialized cohorts which do not belong to a bookmark
  const filteredMaterializedCohorts = _filterUntaggedMaterializedCohorts(
    bookmarksWithId,
    formattedMaterializedCohorts,
  );

  return [...bookmarksWithId, ...filteredMaterializedCohorts];
};

export const getCohortDefinition = async (
  token: string,
  _datasetId: string,
  cohortDefinitionId: number,
) => {
  const webApiApi = new WebAPIAPI(token);
  const cohortDefinition =
    await webApiApi.getCohortDefinition(cohortDefinitionId);
  return normalizeCohortDefinitionExpression(cohortDefinition);
};

export const updateCohortDefinition = async (
  token: string,
  _datasetId: string,
  cohortDefinitionId: number,
  cohortDefinitionDto: z.infer<typeof AtlasCohortDefinitionDto>,
) => {
  const webApiApi = new WebAPIAPI(token);
  const cohortDefinition = await webApiApi.updateCohortDefinition({
    ...cohortDefinitionDto,
    id: cohortDefinitionId,
  });
  return normalizeCohortDefinitionExpression(cohortDefinition);
};

export const deleteCohortDefinition = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number,
) => {
  const analyticsSvcApi = new AnalyticsSvcAPI(token);
  let materializedCohorts: IBaseMaterializedCohort[] = [];
  try {
    const result = await analyticsSvcApi.getFilteredCohorts(datasetId, {
      datasetId,
      atlasCohortDefinitionId: cohortDefinitionId,
    });
    // Handle undefined or non-array results
    materializedCohorts = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(
      "Failed to fetch materialized cohorts during delete, continuing without deletion:",
      error,
    );
  }

  // If atlas cohort definition has a materialized cohort, delete cohort before deleting atlas cohort definition user artifact
  for (const materializedCohort of materializedCohorts) {
    // TODO: Delete materialized cohorts for other datasets as well?
    const analyticsSvcAPI = new AnalyticsSvcAPI(token);
    await analyticsSvcAPI.deleteCohort(datasetId, materializedCohort.id);
  }

  const webApiApi = new WebAPIAPI(token);
  await webApiApi.deleteCohortDefinition(cohortDefinitionId);
  return;
};

export const copyCohortDefinition = async (
  token: string,
  _datasetId: string,
  cohortDefinitionId: number,
) => {
  const webApiApi = new WebAPIAPI(token);
  const cohortDefinition =
    await webApiApi.copyCohortDefinition(cohortDefinitionId);
  return normalizeCohortDefinitionExpression(cohortDefinition);
};

export const checkIfAtlasCohortDefinitionExists = async (
  token: string,
  _datasetId: string,
  cohortDefinitionId: number,
  cohortDefinitionName: string,
): Promise<number> => {
  const webApiApi = new WebAPIAPI(token);
  const webApiCohortDefinitions = await webApiApi.getCohortDefinitionList();

  const nameUsedInOtherDefinition = webApiCohortDefinitions.find(
    (cohortDefinition) =>
      cohortDefinition.id !== cohortDefinitionId &&
      cohortDefinition.name === cohortDefinitionName,
  );
  const result = nameUsedInOtherDefinition ? 1 : 0;
  return result;
};

export const checkV2 = async (
  token: string,
  datasetId: string,
  cohortJsonExpression: ICohortExpression | string,
): Promise<ICohortDefinitionCheckV2ResponseDto> => {
  const trexDao = await TrexDAO.getTrexDao(token, datasetId);
  const warnings =
    await trexDao.validateCohortJsonExpression(cohortJsonExpression);
  return warnings;
};

/**
 * Outcome of a cohort-cache read.
 *
 * `MISS` and `UNAVAILABLE` both fall through to the source query, but they are
 * not interchangeable: only a `MISS` repopulates the cache afterwards. Writing
 * back after an `UNAVAILABLE` would add a second failing call per request to an
 * endpoint that just failed.
 */
enum CohortCacheReadStatus {
  /** Every requested bookmark had an entry — including negative entries. */
  HIT = "hit",
  /** The cache answered, but at least one bookmark had no entry. */
  MISS = "miss",
  /** The cache did not answer at all: error, timeout, missing schema or table. */
  UNAVAILABLE = "unavailable",
}

type CohortCacheReadResult =
  | { status: CohortCacheReadStatus.HIT; cohorts: IBaseMaterializedCohort[] }
  | { status: CohortCacheReadStatus.MISS }
  | { status: CohortCacheReadStatus.UNAVAILABLE };

/**
 * Looks up every bookmark's cohort cache entry in a single call.
 *
 * Returns `hit` only when analytics-svc reported nothing missing *and* every
 * requested id came back under `entries`; `miss` when anything has to be
 * recomputed; `unavailable` when the cache itself could not answer.
 *
 * An entry whose `materializedCohort` is `null` is a
 * cache **HIT**. This is the case where a bookmark has no materialized
 * cohort yet
 */
const _readCohortCache = async (
  analyticsSvcAPI: AnalyticsSvcAPI,
  datasetId: string,
  bookmarkIds: string[],
): Promise<CohortCacheReadResult> => {
  let lookup: ICohortCacheLookupResponse;
  try {
    lookup = await analyticsSvcAPI.cohortCacheLookup(datasetId, bookmarkIds);
  } catch (error) {
    // A shape failure means the cache is reachable but holds something
    // unusable, so recomputing will overwrite it: report MISS, which triggers
    // the write-back. Anything else means the cache is unreachable, where a
    // write would fail too: report UNAVAILABLE and leave it alone.
    const isShapeError = error instanceof CohortCacheShapeError;
    console.error(
      isShapeError
        ? "Cohort cache lookup returned an unusable body, recomputing and overwriting:"
        : "Cohort cache lookup failed, falling back to the uncached path:",
      {
        datasetId,
        bookmarkCount: bookmarkIds.length,
        error: getErrorDetails(error),
      },
    );
    return {
      status: isShapeError
        ? CohortCacheReadStatus.MISS
        : CohortCacheReadStatus.UNAVAILABLE,
    };
  }

  if (lookup.missing.length > 0) {
    return { status: CohortCacheReadStatus.MISS };
  }

  // Collect the cached cohorts; entries cached as null have no materialized cohort.
  const cohorts = Object.values(lookup.entries)
    .map((entry) => entry.materializedCohort)
    .filter((cohort): cohort is IBaseMaterializedCohort => cohort !== null);

  return { status: CohortCacheReadStatus.HIT, cohorts };
};

/**
 * Writes one entry per bookmark: positive where a materialized cohort
 * resolved, negative (`null`) where none did. The negative entries are what
 * let the next load skip `getFilteredCohorts` entirely.
 *
 * Fire and forget by design (spec 4.4) — the returned promise is deliberately
 * not awaited, only `.catch`ed, so a slow or failing cache write can never
 * delay or fail the response.
 */
const _writeCohortCacheEntries = (
  analyticsSvcAPI: AnalyticsSvcAPI,
  datasetId: string,
  bookmarks: IBookmark[],
  baseMaterializedCohorts: IBaseMaterializedCohort[],
): void => {
  if (bookmarks.length === 0) {
    return;
  }

  const cohortsById = new Map<number, IBaseMaterializedCohort>();
  for (const cohort of baseMaterializedCohorts) {
    cohortsById.set(cohort.id, cohort);
  }

  const entries: ICohortCacheWriteEntry[] = bookmarks.map((bookmark) => {
    const cohort =
      bookmark.cohortDefinitionId === undefined
        ? undefined
        : cohortsById.get(bookmark.cohortDefinitionId);

    return {
      bookmarkId: bookmark.bmkId,
      materializedCohort: cohort
        ? {
            id: cohort.id,
            name: cohort.name,
            description: cohort.description,
            creationTimestamp: cohort.creationTimestamp,
            syntax: cohort.syntax,
            patientCount: cohort.patientCount,
          }
        : null,
    };
  });

  analyticsSvcAPI.cohortCacheWrite(datasetId, entries).catch((error) => {
    console.error("Failed to write cohort cache entries:", {
      datasetId,
      entryCount: entries.length,
      error: getErrorDetails(error),
    });
  });
};

const _formatMaterializedCohort = (
  cohortDefinition: IBaseMaterializedCohort,
): IMaterializedCohort => ({
  id: cohortDefinition.id,
  patientCount: cohortDefinition.patientCount,
  cohortDefinitionName: cohortDefinition.name,
  createdOn: cohortDefinition.creationTimestamp.toString(),
  description: cohortDefinition.description,
  syntax: cohortDefinition.syntax,
});

/*
Function to filter out materialized cohorts which do not belong to a formatted bookmark
*/
const _filterUntaggedMaterializedCohorts = (
  bookmarks: IBookmark[],
  formattedMaterializedCohorts: IMaterializedCohort[],
): IMaterializedCohort[] => {
  // Create a set of cohort definition ids which are tagged to a bookmark
  const cohortDefinitionIds = new Set<number>();

  // Add cohort definition ids from bookmarks to cohortDefinitionIds set
  for (const bookmark of bookmarks) {
    if (bookmark.cohortDefinitionId) {
      cohortDefinitionIds.add(bookmark.cohortDefinitionId);
    }
  }

  // Filter materialized cohorts based on cohortDefinitionIds
  const filteredMaterializedCohorts = formattedMaterializedCohorts.filter(
    (materializedCohorts) => {
      return cohortDefinitionIds.has(materializedCohorts.id);
    },
  );

  return filteredMaterializedCohorts;
};
