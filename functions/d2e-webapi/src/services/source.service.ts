import { ISourceDto, IDaimonPriorityResponseDto } from "../dto/source.ts";

import { PortalServerAPI } from "../api/PortalServerAPI.ts";

export const getSources = async (token: string): Promise<ISourceDto[]> => {
  // Get researcher datasets
  const portalServerApi = new PortalServerAPI(token);
  const datasets = await portalServerApi.getResearcherDatasets();

  // Construct response
  let idx = 1; // Dummy idx for sourceId and sourceDaimonId
  const result = datasets.map((dataset) => {
    return {
      sourceId: idx++,
      sourceName: dataset.studyDetail.name,
      sourceDialect: dataset.dialect,
      sourceKey: dataset.id,
      daimons: [
        {
          sourceDaimonId: idx++,
          daimonType: "CDM",
          tableQualifier: dataset.schemaName,
          priority: 1,
        },
        {
          sourceDaimonId: idx++,
          daimonType: "Vocabulary",
          tableQualifier: dataset.vocabSchemaName,
          priority: 1,
        },
      ],
    } as ISourceDto;
  });

  return result;
};

export const getDaimonPriority = async (
  token: string
): Promise<IDaimonPriorityResponseDto> => {
  // Get researcher datasets
  const portalServerApi = new PortalServerAPI(token);
  const datasets = await portalServerApi.getResearcherDatasets();

  // Construct response
  let idx = 1; // Dummy idx for sourceId and sourceDaimonId
  const result = datasets.reduce((acc, dataset) => {
    acc[dataset.schemaName] = {
      sourceId: idx++,
      sourceName: dataset.studyDetail.name,
      sourceDialect: dataset.dialect,
      sourceKey: dataset.id,
      daimons: [
        {
          sourceDaimonId: idx++,
          daimonType: "CDM",
          tableQualifier: dataset.schemaName,
          priority: 1,
        },
        {
          sourceDaimonId: idx++,
          daimonType: "Vocabulary",
          tableQualifier: dataset.vocabSchemaName,
          priority: 1,
        },
      ],
    };
    return acc;
  }, {} as IDaimonPriorityResponseDto);

  return result;
};
