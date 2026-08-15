import { I2B2_PLUGIN } from "../../../../constant";
import { SourceDatasetType, StandaloneDatasetType } from "../../../../types";

// Data model dropdown options look like "v1.8.1 [i2b2_plugin]".
export const parseDatamodelOption = (dataModelOption: string): { dataModel: string; plugin: string } => {
  const parsed = dataModelOption.replace(/[[\]]/g, "").split(" ");
  return { dataModel: parsed[0] ?? "", plugin: parsed[1] ?? "" };
};

// i2b2 data models are a standalone dataset type; everything else is a source dataset.
export const resolveSourceDatasetType = (
  dataModelOption: string
): SourceDatasetType | StandaloneDatasetType =>
  parseDatamodelOption(dataModelOption).plugin === I2B2_PLUGIN
    ? StandaloneDatasetType.I2B2
    : SourceDatasetType.SOURCE;
