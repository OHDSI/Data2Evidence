import { filterAccessibleDatasets } from "../useDatasets";
import { Study } from "../../types";

const datasets = [{ id: "ds-a" }, { id: "ds-b" }, { id: "ds-c" }] as Study[];

describe("filterAccessibleDatasets", () => {
  it("keeps only datasets the user is a researcher on", () => {
    const result = filterAccessibleDatasets(datasets, {
      isSystemAdmin: false,
      isDatasetResearcher: { "ds-b": true },
    });
    expect(result.map((d) => d.id)).toEqual(["ds-b"]);
  });

  it("returns nothing when the user has no researcher roles", () => {
    const result = filterAccessibleDatasets(datasets, {
      isSystemAdmin: false,
      isDatasetResearcher: undefined as any,
    });
    expect(result).toEqual([]);
  });

  it("returns every dataset for a system admin", () => {
    const result = filterAccessibleDatasets(datasets, {
      isSystemAdmin: true,
      isDatasetResearcher: {},
    });
    expect(result).toEqual(datasets);
  });
});
