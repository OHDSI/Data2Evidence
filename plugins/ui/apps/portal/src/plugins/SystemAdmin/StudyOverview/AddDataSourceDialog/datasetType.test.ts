import { filterCreatableDataModels, isWebApiManagedDataset, parseDatamodelOption } from "./datasetType";
import { SourceDatasetType } from "../../../../types";

describe("parseDatamodelOption", () => {
  it("splits a data model option into data model and plugin", () => {
    expect(parseDatamodelOption("v1.8.1 [i2b2_plugin]")).toEqual({
      dataModel: "v1.8.1",
      plugin: "i2b2_plugin",
    });
    expect(parseDatamodelOption("omop5.4 [omop_cdm_plugin]")).toEqual({
      dataModel: "omop5.4",
      plugin: "omop_cdm_plugin",
    });
  });
});

describe("isWebApiManagedDataset", () => {
  it("is true for Postgres datasets", () => {
    expect(isWebApiManagedDataset("postgres", SourceDatasetType.SOURCE)).toBe(true);
  });

  it("is false for HANA and FHIR", () => {
    expect(isWebApiManagedDataset("hana", "omop")).toBe(false);
    expect(isWebApiManagedDataset("", SourceDatasetType.FHIR)).toBe(false);
  });
});

describe("filterCreatableDataModels", () => {
  const options = [
    "omop5-4 [omop_cdm_plugin]",
    "v1.8.1 [i2b2_plugin]",
    "waveform [data_management_plugin]",
    "medical-imaging [data_management_plugin]",
    "custom [custom-flow]",
  ];

  it("offers only OMOP models outside HANA", () => {
    expect(filterCreatableDataModels(options, "postgres")).toEqual(["omop5-4 [omop_cdm_plugin]"]);
  });

  it("offers every model except i2b2 on HANA", () => {
    expect(filterCreatableDataModels(options, "hana")).toEqual([
      "omop5-4 [omop_cdm_plugin]",
      "waveform [data_management_plugin]",
      "medical-imaging [data_management_plugin]",
      "custom [custom-flow]",
    ]);
  });
});
