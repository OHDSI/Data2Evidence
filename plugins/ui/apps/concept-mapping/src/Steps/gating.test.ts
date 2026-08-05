import { describe, expect, test } from "vitest";
import { initialState } from "../Context/ConceptMappingContext";
import { canProceedStep1, canProceedStep2 } from "./gating";
import { NOT_APPLICABLE } from "../source/source-adapter";
import { ConceptMappingState } from "../types";

const withWizard = (patch: Partial<ConceptMappingState["wizard"]>): ConceptMappingState => ({
  ...initialState,
  wizard: { ...initialState.wizard, ...patch },
});

describe("canProceedStep1", () => {
  test("false without dataset or source", () => {
    expect(canProceedStep1(initialState)).toBe(false);
  });
  test("false when source has no columns", () => {
    expect(canProceedStep1(withWizard({
      datasetId: "ds", sourceData: { type: "csv", columns: [] },
    }))).toBe(false);
  });
  test("true with dataset + source columns", () => {
    expect(canProceedStep1(withWizard({
      datasetId: "ds", sourceData: { type: "csv", columns: ["a"] },
    }))).toBe(true);
  });
});

describe("canProceedStep2", () => {
  const base = (cm: Partial<ConceptMappingState["columnMapping"]>): ConceptMappingState => ({
    ...initialState,
    columnMapping: { sourceCode: "", sourceName: "", sourceFrequency: "", description: "", ...cm },
  });
  test("false when required unmapped", () => {
    expect(canProceedStep2(base({ sourceCode: "a" }))).toBe(false);
  });
  test("false when required set to Not-applicable", () => {
    expect(canProceedStep2(base({ sourceCode: NOT_APPLICABLE, sourceName: "b" }))).toBe(false);
  });
  test("true when sourceCode + sourceName mapped", () => {
    expect(canProceedStep2(base({ sourceCode: "a", sourceName: "b" }))).toBe(true);
  });
});
