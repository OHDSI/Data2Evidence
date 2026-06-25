import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { WebAPIAPI } from "../api/WebAPIAPI.ts";
import { ICohortDefinitionMigrateResponseDto } from "../dto/migrate.ts";
import {
  UserArtifactAtlasCohortDefinitionDto,
  IUserArtifactAtlasCohortDefinitionDto,
} from "../dto/cohortdefinition.ts";
import {
  IWebAPICohortDefinitionExpressionType,
  IWebAPICohortDefinitionPayload,
} from "../api/WebAPIAPI.ts";

const mapUserArtifactToWebApiPayload = (
  cohortDefinition: IUserArtifactAtlasCohortDefinitionDto,
): IWebAPICohortDefinitionPayload => {
  const toWebApiExpressionType = (
    value: string,
  ): IWebAPICohortDefinitionExpressionType => {
    if (
      value === "SIMPLE_EXPRESSION" ||
      value === "CUSTOM_SQL" ||
      value === "EXTERNAL_SOURCED"
    ) {
      return value;
    } else {
      // For migration, if expressionType does not match, default to EXTERNAL_SOURCED
      return "EXTERNAL_SOURCED";
    }
  };

  return {
    name: cohortDefinition.name,
    description: cohortDefinition.description ?? "",
    expressionType: toWebApiExpressionType(cohortDefinition.expressionType),
    expression: cohortDefinition.expression,
  };
};

export const migrateCohortDefinitions = async (
  token: string,
): Promise<ICohortDefinitionMigrateResponseDto> => {
  const portalServerApi = new PortalServerAPI(token);
  const webApiApi = new WebAPIAPI(token);

  const sourceCohortDefinitions =
    await portalServerApi.getAtlasCohortDefinitionList();
  const totalMigrations = sourceCohortDefinitions.length;
  let successfulMigrations = 0;

  for (const sourceCohortDefinition of sourceCohortDefinitions) {
    const sourceParse = UserArtifactAtlasCohortDefinitionDto.safeParse(
      sourceCohortDefinition,
    );
    if (!sourceParse.success) {
      console.error(
        "Migration skipped due to invalid Portal cohort definition shape:",
        sourceParse.error,
      );
      continue;
    }
    const createPayload = mapUserArtifactToWebApiPayload(sourceParse.data);
    const sourceCohortDefinitionId = sourceParse.data.id;

    try {
      await webApiApi.createCohortDefinition(createPayload);
    } catch (error) {
      console.error(
        "Migration create step failed for atlas cohort definition:",
        sourceCohortDefinitionId,
        error,
      );
      continue;
    }

    try {
      await portalServerApi.deleteAtlasCohortDefinition(
        sourceCohortDefinitionId,
      );
      successfulMigrations++;
    } catch (error) {
      console.error(
        "Migration delete step failed for atlas cohort definition:",
        sourceCohortDefinitionId,
        error,
      );
    }
  }

  return { successfulMigrations, totalMigrations };
};
