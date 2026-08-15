import { parseDatamodelOption, resolveSourceDatasetType } from "./datasetType";
import { SourceDatasetType, StandaloneDatasetType } from "../../../../types";

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

describe("resolveSourceDatasetType", () => {
  it("returns i2b2 for the i2b2 plugin", () => {
    expect(resolveSourceDatasetType("v1.8.1 [i2b2_plugin]")).toBe(StandaloneDatasetType.I2B2);
  });

  it("returns source for any non-i2b2 data model", () => {
    expect(resolveSourceDatasetType("omop5.4 [omop_cdm_plugin]")).toBe(SourceDatasetType.SOURCE);
    expect(resolveSourceDatasetType("")).toBe(SourceDatasetType.SOURCE);
  });
});
