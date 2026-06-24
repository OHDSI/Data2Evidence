import { IAtlasCohortDefinition } from "../api/types.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { IUserArtifactAtlasCohortDefinitionDto } from "../dto/cohortdefinition.ts";

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

export const mapUserArtifactAtlasCohortDefinitions = (
  atlasCohortDefinitions: IUserArtifactAtlasCohortDefinitionDto[],
): IAtlasCohortDefinition[] =>
  atlasCohortDefinitions.map((atlasCohortDefinition) => ({
    id: atlasCohortDefinition.id,
    name: atlasCohortDefinition.name,
    description: atlasCohortDefinition.description,
    createdBy: atlasCohortDefinition.createdBy,
    createdDate: parseDateToEpoch(atlasCohortDefinition.createdDate),
    modifiedBy: atlasCohortDefinition.modifiedBy,
    modifiedDate: parseDateToEpoch(atlasCohortDefinition.modifiedDate),
    hasWriteAccess: true,
    hasReadAccess: true,
    tags: atlasCohortDefinition.tags,
    isUserArtifact: true,
  }));

export const getUserArtifactAtlasCohortDefinitionList = async (
  portalServerApi: PortalServerAPI,
  datasetId: string,
): Promise<IAtlasCohortDefinition[]> => {
  const atlasCohortDefinitions =
    await portalServerApi.getAtlasCohortDefinitionList(datasetId);
  return mapUserArtifactAtlasCohortDefinitions(atlasCohortDefinitions);
};
