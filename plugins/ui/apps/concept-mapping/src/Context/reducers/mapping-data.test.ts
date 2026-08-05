import { describe, expect, test } from "vitest";
import { initialState } from "../ConceptMappingContext";
import { setMultipleMapping, setSingleMapping, approveRow, uncheckRow, toggleRowFlag } from "./mapping-data";
import { mappingData, conceptData, StandardConcepts } from "../../types";

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

const concept: conceptData = {
  conceptId: 111,
  conceptName: "Aspirin",
  domainId: "Drug",
  system: "RxNorm",
  validStartDate: "2020-01-01",
  validEndDate: "2099-12-31",
  validity: "Valid",
};

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

  test("setSingleMapping sets concept fields and status to suggested", () => {
    const target = row();
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [target, row({ code: "B2" })] },
      selectedData: target,
    };

    const next = setSingleMapping(state, concept);

    expect(next.csvData.data[0]).toMatchObject({ conceptId: 111, conceptName: "Aspirin", status: "suggested" });
    expect(next.csvData.data[1]).toMatchObject({ code: "B2", status: "unchecked" });
  });

  test("approveRow sets status to approved for the referenced row only", () => {
    const target = row({ conceptId: 111, status: "suggested" });
    const other = row({ code: "B2" });
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [target, other] },
    };

    const next = approveRow(state, target);

    expect(next.csvData.data[0].status).toBe("approved");
    expect(next.csvData.data[1].status).toBe("unchecked");
    // original state untouched (immutability)
    expect(state.csvData.data[0].status).toBe("suggested");
  });

  test("uncheckRow sets status back to unchecked for the referenced row only", () => {
    const target = row({ conceptId: 111, status: "approved" });
    const other = row({ code: "B2", status: "approved" });
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [target, other] },
    };

    const next = uncheckRow(state, target);

    expect(next.csvData.data[0].status).toBe("unchecked");
    expect(next.csvData.data[1].status).toBe("approved");
  });

  test("toggleRowFlag flips flagged on, then off, for the referenced row", () => {
    const target = row();
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [target] },
    };

    const flaggedOn = toggleRowFlag(state, target);
    expect(flaggedOn.csvData.data[0].flagged).toBe(true);

    const flaggedOff = toggleRowFlag(flaggedOn, flaggedOn.csvData.data[0]);
    expect(flaggedOff.csvData.data[0].flagged).toBe(false);
  });

  test("approveRow/uncheckRow/toggleRowFlag are no-ops when the row reference is not found", () => {
    const state = {
      ...initialState,
      csvData: { name: "x", columns: ["code"], data: [row()] },
    };
    const stray = row({ code: "not-in-list" });

    expect(approveRow(state, stray)).toEqual(state);
    expect(uncheckRow(state, stray)).toEqual(state);
    expect(toggleRowFlag(state, stray)).toEqual(state);
  });
});
