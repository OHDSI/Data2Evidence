import { z } from "zod";

import {
  IBookmark,
  ICohortDefinition,
  ICohortGeneratorFlowRun,
  ICombinedCohortDefnitionListItem,
  IMaterializedCohort,
  IBaseMaterializedCohort,
  IAtlasCohortDefinition,
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
import { getUserArtifactAtlasCohortDefinitionList } from "./cohortdefinition-user-artifact.service.ts";

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
      createdDate: Date.parse(analyticsCohortDefinition.cohort_initiation_date),
      modifiedDate: Date.parse(
        analyticsCohortDefinition.cohort_initiation_date,
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
      jobName: `Generate Cohort ${analyticsCohortDefinition.cohort_definition_name}`,
      generate_stats: "true",
      jobAuthor: "NA", // Not applicable
      sessionId: "NA", // Not applicable
      cohort_definition_id: analyticsCohortDefinition.cohort_definition_id,
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
  isAtlas: boolean,
): Promise<ICombinedCohortDefnitionListItem[]> => {
  const webApiApi = new WebAPIAPI(token);

  const parseDateToEpoch = (value: number | string | null | undefined) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsedDate = Date.parse(value);
      return Number.isNaN(parsedDate) ? null : parsedDate;
    }
    return null;
  };

  const getUserName = (
    value: string | null | undefined | { name?: string | null },
  ) => {
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object") {
      return value.name ?? null;
    }
    return null;
  };

  const getTagName = (tag: string | { name?: string | null }) => {
    if (typeof tag === "string") {
      return tag;
    }
    return tag.name ?? "";
  };

  const mapAtlasCohortDefinitions = (
    atlasCohortDefinitions: Awaited<
      ReturnType<typeof webApiApi.getCohortDefinitionList>
    >,
  ): IAtlasCohortDefinition[] =>
    atlasCohortDefinitions.map((atlasCohortDefinition) => ({
      id: atlasCohortDefinition.id,
      name: atlasCohortDefinition.name,
      description: atlasCohortDefinition.description ?? null,
      createdBy: getUserName(atlasCohortDefinition.createdBy),
      createdDate: parseDateToEpoch(atlasCohortDefinition.createdDate),
      modifiedBy: getUserName(atlasCohortDefinition.modifiedBy),
      modifiedDate: parseDateToEpoch(atlasCohortDefinition.modifiedDate),
      hasWriteAccess: atlasCohortDefinition.writeAccess,
      hasReadAccess: atlasCohortDefinition.readAccess,
      tags: (atlasCohortDefinition.tags ?? []).map(getTagName),
    }));

  // isAtlas=true only needs atlas cohort definitions and return early
  if (isAtlas) {
    const atlasCohortDefinitions = await webApiApi.getCohortDefinitionList();
    return mapAtlasCohortDefinitions(atlasCohortDefinitions);
  }
  const bookmarksApi = new BookmarksAPI(token);
  const portalServerApi = new PortalServerAPI(token);
  const analyticsSvcAPI = new AnalyticsSvcAPI(token);
  const materializedCohortFetchStartedAt = Date.now();

  const [
    atlasCohortDefinitions,
    userArtifactAtlasCohortDefinitions,
    rawDataFromBookmarks,
    baseMaterializedCohorts,
  ] = await Promise.all([
    webApiApi.getCohortDefinitionList().catch((error) => {
      console.error(
        "Failed to fetch atlas cohort definitions, continuing with empty list:",
        error,
      );
      return [] as Awaited<
        ReturnType<typeof webApiApi.getCohortDefinitionList>
      >;
    }),
    getUserArtifactAtlasCohortDefinitionList(
      portalServerApi,
      datasetId,
    ).catch((error) => {
      console.error(
        "Failed to fetch user artifact atlas cohort definitions, continuing with empty list:",
        error,
      );
      return [] as IAtlasCohortDefinition[];
    }),
    bookmarksApi.getAllBookmarks(datasetId).catch((error) => {
      console.error(
        "Failed to fetch bookmarks, continuing with empty list:",
        error,
      );
      return { bookmarks: [] as IBookmark[], schemaName: "" };
    }),
    (async (): Promise<IBaseMaterializedCohort[]> => {
      const canMaterializeCohort = await withRetry(
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
      });

      if (!canMaterializeCohort) {
        return [];
      }

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

      return result;
    })(),
  ]);

  // Parse bookmark and atlas cohort definition
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
  const mappedAtlasCohortDefinitions = mapAtlasCohortDefinitions(
    atlasCohortDefinitions,
  );
  const parsedAtlasCohortDefinitions = [
    ...mappedAtlasCohortDefinitions,
    ...userArtifactAtlasCohortDefinitions,
  ];

  // Create mappings for materialized cohorts to bookmarks and atlas cohort definitions respectively
  const bookmarkIdToCohortId = new Map<string, number>();
  const atlasDefIdToCohortId = new Map<number, number>();

  // Sort baseMaterializedCohorts so that the latest materialized cohort definition is matched with the corresponding atlas cohort definition
  baseMaterializedCohorts.sort((a, b) => a.id - b.id);
  for (const cohort of baseMaterializedCohorts) {
    let syntax: { bookmarkId?: string; atlasCohortDefinitionId?: number };
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
    if (syntax.atlasCohortDefinitionId !== undefined) {
      atlasDefIdToCohortId.set(syntax.atlasCohortDefinitionId, cohort.id);
    }
  }

  // Add cohortDefinitionId to bookmarks if there is a respective materialized cohort
  const bookmarksWithId = parsedbookmarks.map((bookmark) => ({
    ...bookmark,
    cohortDefinitionId: bookmarkIdToCohortId.get(bookmark.bmkId),
  }));
  // Add cohortDefinitionId to atlas cohort definition if there is a respective materialized cohort
  const cohortDefinitionsWithId = parsedAtlasCohortDefinitions.map(
    (atlasCohortDefinition) => ({
      ...atlasCohortDefinition,
      cohortDefinitionId: atlasDefIdToCohortId.get(atlasCohortDefinition.id),
    }),
  );

  // Parse and filter materialized cohorts
  const formattedMaterializedCohorts = baseMaterializedCohorts.map((cohort) =>
    _formatMaterializedCohort(cohort, !isAtlas),
  );
  // Filter out materialized cohorts which do not belong to a bookmark or atlas cohort definition
  const filteredMaterializedCohorts = _filterUntaggedMaterializedCohorts(
    bookmarksWithId,
    cohortDefinitionsWithId,
    formattedMaterializedCohorts,
  );

  return [
    ...bookmarksWithId,
    ...filteredMaterializedCohorts,
    ...cohortDefinitionsWithId,
  ];
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

const _formatMaterializedCohort = (
  cohortDefinition: IBaseMaterializedCohort,
  includeSyntax: boolean = false,
): IMaterializedCohort => ({
  id: cohortDefinition.id,
  patientCount: cohortDefinition.patientCount,
  cohortDefinitionName: cohortDefinition.name,
  createdOn: cohortDefinition.creationTimestamp.toString(),
  description: cohortDefinition.description,
  ...(includeSyntax && { syntax: cohortDefinition.syntax }),
});

/*
Function to filter out materialized cohorts which do not belong to a formatted bookmark or formatted atlas cohort definition
*/
const _filterUntaggedMaterializedCohorts = (
  bookmarks: IBookmark[],
  AtlasCohortDefinitions: IAtlasCohortDefinition[],
  formattedMaterializedCohorts: IMaterializedCohort[],
): IMaterializedCohort[] => {
  // Create a set of cohort definition ids which are tagged to either a bookmark or atlas cohort definition
  const cohortDefinitionIds = new Set<number>();

  // Add cohort definition ids from bookmarks to cohortDefinitionIds set
  for (const bookmark of bookmarks) {
    if (bookmark.cohortDefinitionId) {
      cohortDefinitionIds.add(bookmark.cohortDefinitionId);
    }
  }

  // Add cohort definition ids from AtlasCohortDefinitions to cohortDefinitionIds set
  for (const atlasCohortDefinition of AtlasCohortDefinitions) {
    if (atlasCohortDefinition.cohortDefinitionId) {
      cohortDefinitionIds.add(atlasCohortDefinition.cohortDefinitionId);
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
