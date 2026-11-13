import { I2B2_PLUGIN } from "../../../../constant";
import { SourceDatasetType } from "../../../../types";

// Data model dropdown options look like "v1.8.1 [i2b2_plugin]".
export const parseDatamodelOption = (dataModelOption: string): { dataModel: string; plugin: string } => {
  const parsed = dataModelOption.replace(/[[\]]/g, "").split(" ");
  return { dataModel: parsed[0] ?? "", plugin: parsed[1] ?? "" };
};

// New Postgres datasets are WebAPI-managed; HANA and FHIR keep their own dataset types.
export const isWebApiManagedDataset = (dialect: string, type: string): boolean =>
  dialect !== "hana" && type !== SourceDatasetType.FHIR;

// WebAPI-managed datasets require OMOP, so only OMOP models can be created outside HANA. i2b2 can no longer be created.
export const filterCreatableDataModels = (dataModelOptions: string[], dialect: string): string[] =>
  dataModelOptions.filter(
    (option) =>
      parseDatamodelOption(option).plugin !== I2B2_PLUGIN &&
      (dialect === "hana" || option.toLowerCase().startsWith("omop"))
  );
