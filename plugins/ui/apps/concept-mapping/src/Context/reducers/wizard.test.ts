import { describe, expect, test } from "vitest";
import { initialState } from "../ConceptMappingContext";
import {
  setWizardStep,
  setSourceData,
  setDatasetId,
  setLoadRecommendation,
  resetDownstream,
  setMappingStarted,
} from "./wizard";
import { SourceData } from "../../types/source";

const src: SourceData = { type: "csv", columns: ["a"], rows: [{ a: 1 }] };

describe("wizard reducers", () => {
  test("setWizardStep", () => {
    expect(setWizardStep(initialState, 2).wizard.currentStep).toBe(2);
  });

  test("setSourceData sets data and derives sourceType", () => {
    const next = setSourceData(initialState, src);
    expect(next.wizard.sourceData).toEqual(src);
    expect(next.wizard.sourceType).toBe("csv");
  });

  test("setSourceData(null) clears type", () => {
    const next = setSourceData(setSourceData(initialState, src), null);
    expect(next.wizard.sourceData).toBeNull();
    expect(next.wizard.sourceType).toBeNull();
  });

  test("setDatasetId", () => {
    expect(setDatasetId(initialState, "ds-1").wizard.datasetId).toBe("ds-1");
  });

  test("setLoadRecommendation", () => {
    expect(setLoadRecommendation(initialState, true).wizard.loadRecommendationByDefault).toBe(true);
  });

  test("setMappingStarted", () => {
    expect(setMappingStarted(initialState, true).wizard.mappingStarted).toBe(true);
    expect(setMappingStarted(initialState, false).wizard.mappingStarted).toBe(false);
  });

  test("resetDownstream clears columnMapping and csvData", () => {
    const dirty = {
      ...initialState,
      columnMapping: { sourceCode: "a", sourceName: "b", sourceFrequency: "c", description: "d" },
      csvData: { name: "f", columns: ["a"], data: [{ status: "checked", a: 1 } as any] },
    };
    const next = resetDownstream(dirty);
    expect(next.columnMapping).toEqual({ sourceCode: "", sourceName: "", sourceFrequency: "", description: "" });
    expect(next.csvData).toEqual({ name: "", columns: [], data: [] });
  });
});
