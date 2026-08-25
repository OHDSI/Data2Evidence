import { describe, expect, test } from "vitest";
import { initialState } from "../ConceptMappingContext";
import { setMultipleMapping } from "./mapping-data";
import { mappingData, StandardConcepts } from "../../types";

const row = (overrides: Partial<mappingData> = {}): mappingData => ({
  status: "unchecked",
  conceptId: 0,
  conceptName: "",
  domainId: "",
  system: "",
  validStartDate: "",
  validEndDate: "",
  validity: null,
  code: "A1",
  name: "Aspirin",
  ...overrides,
});

const recommendedConcept: StandardConcepts = {
  index: 0,
  conceptId: 111,
  conceptName: "Aspirin",
  conceptCode: "1191",
  domainId: "Drug",
  vocabularyId: "RxNorm",
};

describe("mapping-data reducers", () => {
  test("setMultipleMapping fills concept fields and sets status to unchecked", () => {
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [row(), row({ code: "B2" })] },
    };

    const next = setMultipleMapping(state, [recommendedConcept]);

    expect(next.csvData.data[0]).toMatchObject({ conceptId: 111, conceptName: "Aspirin", status: "unchecked" });
    // untouched row stays as-is
    expect(next.csvData.data[1]).toMatchObject({ code: "B2", status: "unchecked" });
  });
});
