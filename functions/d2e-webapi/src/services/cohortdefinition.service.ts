import { z } from "zod";

import {
  ICohortDefinition,
  ICohortGeneratorFlowRun,
  ICohortDefinitionSyntax,
} from "../api/types.ts";

import { AnalyticsSvcAPI } from "../api/AnalyticsAPI.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import {
  CohortDefinitionDto,
  CohortDefinitionCreateResponseDto,
} from "../dto/cohortdefinition.ts";

export const generateCohort = async (
  token: string,
  datasetId: string,
  cohortDefinitionId: number
) => {
  // Get dataset
  const { databaseCode, schemaName, vocabSchemaName } =
    await new PortalServerAPI(token).getStudy(datasetId);

  // Get cohort definition via cohort definition id
  const analyticsCohortDefinition = await new AnalyticsSvcAPI(
    token
  ).getCohortDefinition(datasetId, cohortDefinitionId);

  const analyticsCohortDefinitionSyntax: ICohortDefinitionSyntax = JSON.parse(
    analyticsCohortDefinition.cohort_definition_syntax
  );

  const cohortGeneratorFlowRun: ICohortGeneratorFlowRun = {
    datasetId,
    databaseCode,
    schemaName,
    vocabSchemaName,
    cohortDefinitionId,
    description: analyticsCohortDefinition.cohort_definition_description,
    cohortJson: {
      id: analyticsCohortDefinition.cohort_definition_id,
      name: analyticsCohortDefinition.cohort_definition_name,
      createdDate: Date.parse(analyticsCohortDefinition.cohort_initiation_date),
      modifiedDate: Date.parse(
        analyticsCohortDefinition.cohort_initiation_date
      ),
      hasWriteAccess: true, // Not used by flow
      tags: [],
      expressionType: analyticsCohortDefinitionSyntax.expressionType,
      expression: analyticsCohortDefinitionSyntax.expression,
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
  cohortDefinitionDto: z.infer<typeof CohortDefinitionDto>
) => {
  const { name, description, expressionType, expression, tags, createdDate } =
    cohortDefinitionDto;

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

  // Create cohort definition
  const analyticsSvcApi = new AnalyticsSvcAPI(token);
  const cohortDefinitionId = await analyticsSvcApi.createCohortDefinition(
    datasetId,
    cohortDefinitionData
  );

  // Construct response
  const result: z.infer<typeof CohortDefinitionCreateResponseDto> = {
    id: cohortDefinitionId,
    name,
    description,
    expressionType,
    expression,
    createdDate,
    hasWriteAccess: true,
    hasReadAccess: true,
  };
  return result;
};
