import { ActionSelectorMap, InformationPageMap, ResearcherFeatureMap, I2B2_PLUGIN } from "./constant";

describe("i2b2 dataset type maps", () => {
  it("exposes the i2b2 plugin identifier", () => {
    expect(I2B2_PLUGIN).toBe("i2b2_plugin");
  });

  it("i2b2 action menu excludes create-cache and transform-to-webapi", () => {
    const actions = ActionSelectorMap["i2b2"];
    expect(actions).toEqual(["metadata", "permissions", "resources", "delete"]);
    expect(actions).not.toContain("create-cache");
    expect(actions).not.toContain("transform-to-webapi");
  });

  it("i2b2 has an information page and researcher features", () => {
    expect(InformationPageMap["i2b2"]).toEqual(["info"]);
    expect(ResearcherFeatureMap["i2b2"]).toEqual(["Cohorts", "Notebooks"]);
  });
});
