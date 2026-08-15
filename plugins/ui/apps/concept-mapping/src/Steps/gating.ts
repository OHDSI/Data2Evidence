import { ConceptMappingState } from "../types";
import { NOT_APPLICABLE } from "../source/source-adapter";

export function canProceedStep1(state: ConceptMappingState): boolean {
  const { datasetId, sourceData } = state.wizard;
  return !!datasetId && !!sourceData && sourceData.columns.length > 0;
}

export function canProceedStep2(state: ConceptMappingState): boolean {
  const { sourceCode, sourceName } = state.columnMapping;
  const isMapped = (v?: string) => !!v && v !== NOT_APPLICABLE;
  return isMapped(sourceCode) && isMapped(sourceName);
}
