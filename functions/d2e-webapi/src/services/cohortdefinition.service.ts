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
import { BookmarksAPI } from "../api/BookmarksAPI.ts";
import {
  AtlasCohortDefinitionDto,
  CohortDefinitionCreateResponseDto,
  CohortDefinitionCopyResponseDto,
  CohortDefinitionResponseDto,
  IUserArtifactAtlasCohortDefinitionDto,
  IGenerateCohortResponseDto,
  ICohortDefinitionCheckV2ResponseDto,
} from "../dto/cohortdefinition.ts";
import { BookmarksSchema } from "../api/types.ts";
import { ICohortExpression, UserArtifactServiceNames } from "../types.ts";
import { TrexDAO } from "../dao/trex.dao.ts";

export const generateCohort = async (
  token: string,
  datasetId: string,
  atlasCohortDefinitionId: number
) => {
  const portalServerApi = new PortalServerAPI(token);
  // Get dataset
  const { databaseCode, schemaName, vocabSchemaName, resultsSchemaName } =
    await portalServerApi.getStudy(datasetId);

  // Get atlas cohort definition from user artifacts via cohort definition id
  const userArtifactAtlasCohortDefinition =
    await portalServerApi.getAtlasCohortDefinition(
      datasetId,
      atlasCohortDefinitionId
    );
  const { name, description, expressionType, expression, tags } =
    userArtifactAtlasCohortDefinition;

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
    cohortDefinitionData
  );
  // Get cohort definition via cdm cohort definition id
  const analyticsCohortDefinition = await new AnalyticsSvcAPI(
    token
  ).getCohortDefinition(datasetId, cdmCohortDefinitionId);

  const cohortGeneratorFlowRun: ICohortGeneratorFlowRun = {
    datasetId,
    databaseCode,
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
        analyticsCohortDefinition.cohort_initiation_date
      ),
      hasWriteAccess: true, // Not used by flow
      tags: [],
      expressionType,
      expression,
    },
  };

  const flowRunId = await new JobPluginsAPI(token).createCohortGeneratorFlowRun(
    cohortGeneratorFlowRun
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
  datasetId: string,
  cohortDefinitionDto: z.infer<typeof AtlasCohortDefinitionDto>
) => {
  // Get atlas cohort definition id from sequence
  const portalServerApi = new PortalServerAPI(token);
  const atlasCohortDefinitionId =
    await portalServerApi.getUserArtifactSequenceNextval(
      datasetId,
      UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS
    );

  const userArtifactAtlasCohortDefinition: IUserArtifactAtlasCohortDefinitionDto =
    {
      ...cohortDefinitionDto,
      id: atlasCohortDefinitionId,
    };
  // Create atlas_cohort_definition in user artifact
  const portalUserArtifacts = await portalServerApi.createAtlasCohortDefinition(
    datasetId,
    userArtifactAtlasCohortDefinition
  );

  // Construct response
  const response: z.infer<typeof CohortDefinitionCreateResponseDto> = {
    id: atlasCohortDefinitionId,
    name: cohortDefinitionDto.name,
    description: cohortDefinitionDto.description,
    expressionType: cohortDefinitionDto.expressionType,
    expression: cohortDefinitionDto.expression,
    createdDate: Date.parse(portalUserArtifacts.createdDate),
    hasWriteAccess: true,
    hasReadAccess: true,
  };
  return response;
};

export const getCohortDefinitionList = async (
  token: string,
  datasetId: string,
  isAtlas: boolean
): Promise<ICombinedCohortDefnitionListItem[]> => {
  const portalServerApi = new PortalServerAPI(token);
  const atlasCohortDefinitions =
    await portalServerApi.getAtlasCohortDefinitionList(datasetId);

  const baseCohortDefinitions = atlasCohortDefinitions.map(
    (atlasCohortDefinition) => ({
      id: atlasCohortDefinition.id,
      name: atlasCohortDefinition.name,
      description: atlasCohortDefinition.description,
      createdBy: atlasCohortDefinition.createdBy,
      createdDate: atlasCohortDefinition.createdDate,
      modifiedBy: atlasCohortDefinition.modifiedBy,
      modifiedDate: atlasCohortDefinition.modifiedDate,
      hasWriteAccess: true,
      hasReadAccess: true,
      tags: atlasCohortDefinition.tags,
    })
  );

  // Return early if isAtlas is true
  if (isAtlas) {
    return baseCohortDefinitions;
  }

  // Else continue to load PA bookmarks and materialized cohorts
  const bookmarksApi = new BookmarksAPI(token);
  const rawDataFromBookmarks = await bookmarksApi.getAllBookmarks(datasetId);
  const parsedBookmarksData = BookmarksSchema.parse(rawDataFromBookmarks);

  // Try to get materialized cohorts, but continue with empty list if it fails
  const analyticsSvcAPI = new AnalyticsSvcAPI(token);
  let baseMaterializedCohorts: IBaseMaterializedCohort[] = [];
  try {
    const result = await analyticsSvcAPI.getFilteredCohorts(datasetId, {
      datasetId,
    });
    // Handle undefined or non-array results
    baseMaterializedCohorts = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(
      "Failed to fetch materialized cohorts, continuing with empty list:",
      error
    );
  }

  // Parse bookmark and atlas cohort definition
  const parsedbookmarks: IBookmark[] = parsedBookmarksData.bookmarks.map(
    (b) => ({
      ...b,
    })
  );
  const parsedAtlasCohortDefinitions: IAtlasCohortDefinition[] =
    baseCohortDefinitions.map((acd) => ({
      ...acd,
    }));

  // Add cohortDefinitionId to bookmarks if there is a respective materialized cohort
  const bookmarksWithId = parsedbookmarks.map((bookmark) => ({
    ...bookmark,
    cohortDefinitionId: _getBookmarkMaterializedCohortDefinitionId(
      bookmark.bmkId,
      baseMaterializedCohorts
    ),
  }));
  // Add cohortDefinitionId to atlas cohort definition if there is a respective materialized cohort
  const cohortDefinitionsWithId = parsedAtlasCohortDefinitions.map(
    (atlasCohortDefinition) => ({
      ...atlasCohortDefinition,
      cohortDefinitionId:
        _getAtlasCohortDefinitionMaterializedCohortDefinitionId(
          atlasCohortDefinition.id,
          baseMaterializedCohorts
        ),
    })
  );

  // Parse and filter materialized cohorts
  const formattedMaterializedCohorts = baseMaterializedCohorts.map((cohort) =>
    _formatMaterializedCohort(cohort)
  );
  // Filter out materialized cohorts which do not belong to a bookmark or atlas cohort definition
  const filteredMaterializedCohorts = _filterUntaggedMaterializedCohorts(
    bookmarksWithId,
    cohortDefinitionsWithId,
    formattedMaterializedCohorts
  );

  return [
    ...bookmarksWithId,
    ...filteredMaterializedCohorts,
    ...cohortDefinitionsWithId,
  ];
};

export const getCohortDefinition = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number
) => {
  const portalServerApi = new PortalServerAPI(token);
  const atlasCohortDefinition = await portalServerApi.getAtlasCohortDefinition(
    datasetId,
    cohortDefinitionId
  );

  // Construct response
  const result: z.infer<typeof CohortDefinitionResponseDto> = {
    id: atlasCohortDefinition.id,
    name: atlasCohortDefinition.name,
    description: atlasCohortDefinition.description,
    createdBy: atlasCohortDefinition.createdBy,
    createdDate: atlasCohortDefinition.createdDate,
    modifiedBy: atlasCohortDefinition.modifiedBy,
    modifiedDate: atlasCohortDefinition.modifiedDate,
    hasWriteAccess: true,
    hasReadAccess: true,
    tags: atlasCohortDefinition.tags,
    expression: atlasCohortDefinition.expression,
    expressionType: atlasCohortDefinition.expressionType,
  };
  return result;
};

export const updateCohortDefinition = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number,
  cohortDefinitionDto: z.infer<typeof AtlasCohortDefinitionDto>
) => {
  const portalServerApi = new PortalServerAPI(token);
  // Get existing atlas cohort definition from user artifacts via cohort definition id
  let userArtifactAtlasCohortDefinition =
    await portalServerApi.getAtlasCohortDefinition(
      datasetId,
      cohortDefinitionId
    );

  // Update existing atlas cohort definition with incoming params
  userArtifactAtlasCohortDefinition = {
    ...userArtifactAtlasCohortDefinition,
    ...cohortDefinitionDto,
  };
  await portalServerApi.updateAtlasCohortDefinition(
    datasetId,
    userArtifactAtlasCohortDefinition
  );

  // Construct response
  const result: z.infer<typeof CohortDefinitionResponseDto> = {
    id: cohortDefinitionId,
    name: userArtifactAtlasCohortDefinition.name,
    description: userArtifactAtlasCohortDefinition.description,
    expressionType: userArtifactAtlasCohortDefinition.expressionType,
    expression: userArtifactAtlasCohortDefinition.expression,
    createdDate: userArtifactAtlasCohortDefinition.createdDate,
    hasWriteAccess: true,
    hasReadAccess: true,
    tags: userArtifactAtlasCohortDefinition.tags,
    modifiedDate: userArtifactAtlasCohortDefinition.modifiedDate,
  };
  return result;
};

export const deleteCohortDefinition = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number
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
      error
    );
  }

  // If atlas cohort definition has a materialized cohort, delete cohort before deleting atlas cohort definition user artifact
  for (const materializedCohort of materializedCohorts) {
    // TODO: Delete materialized cohorts for other datasets as well?
    const analyticsSvcAPI = new AnalyticsSvcAPI(token);
    await analyticsSvcAPI.deleteCohort(datasetId, materializedCohort.id);
  }

  // Delete atlas cohort definition from user artifacts
  const portalServerApi = new PortalServerAPI(token);
  await portalServerApi.deleteAtlasCohortDefinition(
    datasetId,
    cohortDefinitionId
  );
  return;
};

export const copyCohortDefinition = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number
) => {
  const portalServerApi = new PortalServerAPI(token);
  // Get atlas cohort definition from cohort definition id
  const userArtifactAtlasCohortDefinition =
    await portalServerApi.getAtlasCohortDefinition(
      datasetId,
      cohortDefinitionId
    );

  const copyAtlasCohortDefinitionId =
    await portalServerApi.getUserArtifactSequenceNextval(
      datasetId,
      UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS
    );

  const copyUserArtifactAtlasCohortDefinition = {
    ...userArtifactAtlasCohortDefinition,
    id: copyAtlasCohortDefinitionId,
  };
  // Create copy of atlas cohort definition
  await portalServerApi.createAtlasCohortDefinition(
    datasetId,
    copyUserArtifactAtlasCohortDefinition
  );

  // Construct response
  const result: z.infer<typeof CohortDefinitionCopyResponseDto> = {
    id: copyAtlasCohortDefinitionId,
    name: copyUserArtifactAtlasCohortDefinition.name,
    createdDate: copyUserArtifactAtlasCohortDefinition.createdDate,
    hasWriteAccess: true,
    hasReadAccess: true,
    expressionType: copyUserArtifactAtlasCohortDefinition.expressionType,
    expression: copyUserArtifactAtlasCohortDefinition.expression,
  };
  return result;
};

export const checkIfAtlasCohortDefinitionExists = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number,
  cohortDefinitionName: string
): Promise<number> => {
  const portalServerApi = new PortalServerAPI(token);
  const userArtifactAtlasCohortDefinitions =
    await portalServerApi.getAtlasCohortDefinitionList(datasetId);

  const nameUsedInOtherDefinition = userArtifactAtlasCohortDefinitions.find(
    (cd) => {
      cd.id !== cohortDefinitionId && cd.name === cohortDefinitionName;
    }
  );
  const result = nameUsedInOtherDefinition ? 1 : 0;
  return result;
};

export const checkV2 = async (
  token: string,
  datasetId: string,
  cohortJsonExpression: ICohortExpression
): Promise<ICohortDefinitionCheckV2ResponseDto> => {
  const trexDao = await TrexDAO.getTrexDao(token, datasetId);
  const warnings = await trexDao.validateCohortJsonExpression(
    cohortJsonExpression
  );
  return warnings;
};

const _formatMaterializedCohort = (
  cohortDefinition: IBaseMaterializedCohort
): IMaterializedCohort => ({
  id: cohortDefinition.id,
  patientCount: cohortDefinition.patientCount,
  cohortDefinitionName: cohortDefinition.name,
  createdOn: cohortDefinition.creationTimestamp.toString(),
  description: cohortDefinition.description,
});

const _getBookmarkMaterializedCohortDefinitionId = (
  bookmarkId: string,
  materializedCohorts: IBaseMaterializedCohort[]
): number | undefined => {
  for (const cohort of materializedCohorts) {
    const cohortSyntax = JSON.parse(cohort.syntax);
    if (cohortSyntax["bookmarkId"] === bookmarkId) {
      return cohort.id;
    }
  }
  return undefined;
};

const _getAtlasCohortDefinitionMaterializedCohortDefinitionId = (
  atlasCohortDefinitionId: number,
  materializedCohorts: IBaseMaterializedCohort[]
): number | undefined => {
  for (const cohort of materializedCohorts) {
    const cohortSyntax = JSON.parse(cohort.syntax);
    if (cohortSyntax["atlasCohortDefinitionId"] === atlasCohortDefinitionId) {
      return cohort.id;
    }
  }
  return undefined;
};

/*
Function to filter out materialized cohorts which do not belong to a formatted bookmark or formatted atlas cohort definition
*/
const _filterUntaggedMaterializedCohorts = (
  bookmarks: IBookmark[],
  AtlasCohortDefinitions: IAtlasCohortDefinition[],
  formattedMaterializedCohorts: IMaterializedCohort[]
): IMaterializedCohort[] => {
  // Create a list of cohort definitions ids which are tagged to either a bookmark or atlas cohort definition
  const cohortDefinitionIds: number[] = [];

  // Get cohort definition ids from bookmarks
  bookmarks.reduce((acc, bookmark) => {
    if (bookmark.cohortDefinitionId) {
      acc.push(bookmark.cohortDefinitionId);
    }
    return acc;
  }, cohortDefinitionIds);

  // Get cohort definition ids from AtlasCohortDefinitions
  AtlasCohortDefinitions.reduce((acc, atlasCohortDefinition) => {
    if (atlasCohortDefinition.cohortDefinitionId) {
      acc.push(atlasCohortDefinition.cohortDefinitionId);
    }
    return acc;
  }, cohortDefinitionIds);

  const filteredMaterializedCohorts = formattedMaterializedCohorts.filter(
    (materializedCohorts) => {
      return cohortDefinitionIds.includes(materializedCohorts.id);
    }
  );

  return filteredMaterializedCohorts;
};
