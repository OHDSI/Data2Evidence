import { ConceptMappingState } from "../../types";
import { ColumnMappingState } from "../state";

export const setColumnMapping = (state: ConceptMappingState, payload: ColumnMappingState): ConceptMappingState => ({
  ...state,
  columnMapping: payload,
});
