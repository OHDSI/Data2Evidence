import { ConceptMappingState } from "../../types";
import { SourceData } from "../../types/source";

export const setWizardStep = (state: ConceptMappingState, payload: number): ConceptMappingState => ({
  ...state,
  wizard: { ...state.wizard, currentStep: payload },
});

export const setSourceData = (state: ConceptMappingState, payload: SourceData | null): ConceptMappingState => ({
  ...state,
  wizard: { ...state.wizard, sourceData: payload, sourceType: payload?.type ?? null },
});

export const setDatasetId = (state: ConceptMappingState, payload: string | null): ConceptMappingState => ({
  ...state,
  wizard: { ...state.wizard, datasetId: payload },
});

export const setLoadRecommendation = (state: ConceptMappingState, payload: boolean): ConceptMappingState => ({
  ...state,
  wizard: { ...state.wizard, loadRecommendationByDefault: payload },
});

export const resetDownstream = (state: ConceptMappingState): ConceptMappingState => ({
  ...state,
  columnMapping: { sourceCode: "", sourceName: "", sourceFrequency: "", description: "" },
  csvData: { name: "", columns: [], data: [] },
});
