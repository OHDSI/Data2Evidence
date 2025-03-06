import { z } from "zod";

import { ICohortDefinition, ICohortGeneratorFlowRun } from "../api/types.ts";

import { AnalyticsSvcAPI } from "../api/AnalyticsAPI.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import {
  AtlasCohortDefinitionDto,
  CohortDefinitionCreateResponseDto,
  CohortDefinitionCopyResponseDto,
  CohortDefinitionResponseDto,
  IUserArtifactAtlasCohortDefinitionDto,
} from "../dto/cohortdefinition.ts";
import { CachedbDAO } from "../dao/cachedb.dao.ts";
import { CachedbDialect } from "../dao/types.ts";
import { UserArtifactServiceNames } from "../types.ts";

export const generateCohort = async (
  token: string,
  datasetId: string,
  atlasCohortDefinitionId: number
) => {
  const portalServerApi = new PortalServerAPI(token);
  // Get dataset
  const { databaseCode, schemaName, vocabSchemaName } =
    await portalServerApi.getStudy(datasetId);

  // Get atlas cohort definition from user artifacts via cohort definition id
  const userArtifactAtlasCohortDefinition =
    await portalServerApi.getAtlasCohortDefinition(
      datasetId,
      atlasCohortDefinitionId
    );
  const { name, description, expressionType, expression, tags } =
    userArtifactAtlasCohortDefinition;

  // Construct response into OMOP cohort definition format
  const cohortDefinitionData: ICohortDefinition = {
    name,
    description,
    syntax: {
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

  // Update atlas cohort definition user artifact with newly materialized cdm cohort definition id
  // materializedCohortDefinitionIds
  userArtifactAtlasCohortDefinition.materializedCohortDefinitionIds.push(
    cdmCohortDefinitionId
  );
  // Create atlas_cohort_definition in user artifact
  await portalServerApi.createAtlasCohortDefinition(
    datasetId,
    userArtifactAtlasCohortDefinition
  );

  const cohortGeneratorFlowRun: ICohortGeneratorFlowRun = {
    datasetId,
    databaseCode,
    schemaName,
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

  const result = {
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
      materializedCohortDefinitionIds: [], // Sets as empty array as no cohort definitions are materialized yet
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
    createdDate: atlasCohortDefinition.createdDate,
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
  const portalServerApi = new PortalServerAPI(token);

  // Delete all materialized cohorts of atlas cohort definition
  const { materializedCohortDefinitionIds } =
    await portalServerApi.getAtlasCohortDefinition(
      datasetId,
      cohortDefinitionId
    );
  const analyticsSvcApi = new AnalyticsSvcAPI(token);
  for (const id of materializedCohortDefinitionIds) {
    await analyticsSvcApi.deleteCohort(datasetId, id);
  }

  // Delete atlas cohort definition from user artifacts
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

export const checkIfCohortDefinitionExists = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number,
  cohortDefinitionName: string
): Promise<number> => {
  const portalServerApi = new PortalServerAPI(token);
  const { schemaName } = await portalServerApi.getDatasetDetails(datasetId);

  const cachedbDao = new CachedbDAO(token, datasetId, CachedbDialect.POSTGRES);
  const result = await cachedbDao.checkIfCohortDefinitionExists(
    schemaName,
    cohortDefinitionId,
    cohortDefinitionName
  );
  return result;
};
