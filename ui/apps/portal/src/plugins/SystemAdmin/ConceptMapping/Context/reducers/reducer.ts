import { ConceptMappingState } from "../../types";
import { setColumnMapping } from "./column-mapping";
import { setImportData, clearImportData } from "./import-data";
import {
  setInitialData,
  clearData,
  setSingleMapping,
  setMultipleMapping,
  setSelectedData,
  clearSelectedData,
} from "./mapping-data";

export enum ACTION_TYPES {
  SET_COLUMN_MAPPING = "SET_COLUMN_MAPPING",
  SET_IMPORT_DATA = "SET_IMPORT_DATA",
  CLEAR_IMPORT_DATA = "CLEAR_IMPORT_DATA",
  SET_INITAL_DATA = "SET_INITAL_DATA",
  CLEAR_DATA = "CLEAR_DATA",
  SET_SINGLE_MAPPING = "SET_SINGLE_MAPPING",
  SET_MULTIPLE_MAPPING = "SET_MULTIPLE_MAPPING",
  SET_SELECTED_DATA = "SET_SELECTED_DATA",
  CLEAR_SELECTED_DATA = "CLEAR_SELECTED_DATA",
}

type ActionType = keyof typeof ACTION_TYPES;
type ActionFunction = (state: ConceptMappingState, payload?: any) => ConceptMappingState;

const actionMap = new Map<ActionType, ActionFunction>([
  [ACTION_TYPES.SET_COLUMN_MAPPING, setColumnMapping],
  [ACTION_TYPES.SET_IMPORT_DATA, setImportData],
  [ACTION_TYPES.CLEAR_IMPORT_DATA, clearImportData],
  [ACTION_TYPES.SET_INITAL_DATA, setInitialData],
  [ACTION_TYPES.CLEAR_DATA, clearData],
  [ACTION_TYPES.SET_SINGLE_MAPPING, setSingleMapping],
  [ACTION_TYPES.SET_MULTIPLE_MAPPING, setMultipleMapping],
  [ACTION_TYPES.SET_SELECTED_DATA, setSelectedData],
  [ACTION_TYPES.CLEAR_SELECTED_DATA, clearSelectedData],
]);

export interface DispatchType {
  type: ACTION_TYPES;
  payload?: any;
}

export const reducer = (state: ConceptMappingState, { type, payload }: DispatchType) => {
  const mappedAction = actionMap.get(type);
  return mappedAction ? mappedAction(state, payload) : state;
};
