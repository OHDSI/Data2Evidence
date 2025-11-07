import pako from "pako";
import DAO from "./dao/dao";
import { DatabaseConfig, Dataset } from "../types";
import {
  SOURCE_TO_CONCEPT_MAP_TABLE,
  SOURCE_TO_CONCEPT_MAP_COLUMNS,
} from "../constants";
import { PortalAPI } from "../api/PortalAPI";
import { convertZlibBase64ToJson } from "../../../_shared/alp-base-utils/src/utils";

const convert = (stringToConvert: string) =>
  btoa(pako.deflate(stringToConvert, { to: "string" }));

export const getSourceToConceptMappings = async (
  user: string,
  datasetId: string
) => {
  try {
    const dataset: Dataset = await new PortalAPI(user).getDataset(datasetId);
    const client = new DAO(user, dataset);

    return await client.getAllRecords(SOURCE_TO_CONCEPT_MAP_TABLE);
  } catch (error) {
    throw new Error(`Failed to retrieve source to concept mappings:s ${Error}`);
  }
};

export const saveSourceToConceptMappings = async (
  user: string,
  datasetId: string,
  dialect: string,
  sourceVocabularyId: string,
  conceptMappings: string
) => {
  try {
    const dataset: Dataset = await new PortalAPI(user).getDataset(datasetId);

    const client = new DAO(user, dataset);

    const parsedConceptMappings = convertZlibBase64ToJson(conceptMappings).map(
      (mapping) => {
        return {
          ...mapping,
          source_vocabulary_id: sourceVocabularyId,
        };
      }
    );

    const result = await client.insertRecords(
      SOURCE_TO_CONCEPT_MAP_TABLE,
      SOURCE_TO_CONCEPT_MAP_COLUMNS,
      parsedConceptMappings
    );

    return result.rowCount;
  } catch (error) {
    throw new Error(
      `Failed to save source to concept mappings for ${dialect}|${datasetId}: ${Error}`
    );
  }
};
