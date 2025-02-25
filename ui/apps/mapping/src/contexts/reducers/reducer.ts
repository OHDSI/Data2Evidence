import { AppState } from "../states";
import { reset, clearHandles, markAsSaved, load, setVocabularybDatasetId } from "./app";
import {
  setTableNodes,
  setTableEdges,
  addTableConnection,
  setTableSourceHandles,
  setTableTargetHandles,
} from "./table";
import {
  setFieldNodes,
  setFieldEdges,
  addFieldConnection,
  setFieldSourceHandles,
  setFieldTargetHandles,
  setActiveFieldSourceHandles,
  setActiveFieldTargetHandles,
  setActiveSourceTable,
  setActiveTargetTable,
} from "./field";
import { setScannedSchema } from "./scanned-schema";
import { setCdmTables, setCdmVersion } from "./cdm-table";
import { openLoadMappingDialog, openSaveMappingDialog } from "./dialog";

export enum ACTION_TYPES {
  RESET = "RESET",
  LOAD = "LOAD",
  CLEAR_HANDLES = "CLEAR_HANDLES",
  MARK_AS_SAVED = "MARK_AS_SAVED",
  SET_VOCABULARY_DATASET_ID = "SET_VOCABULARY_DATASET_ID",
  OPEN_SAVE_MAPPING_DIALOG = "OPEN_SAVE_MAPPING_DIALOG",
  OPEN_LOAD_MAPPING_DIALOG = "OPEN_LOAD_MAPPING_DIALOG",
  SET_TABLE_NODES = "SET_TABLE_NODES",
  SET_TABLE_EDGES = "SET_TABLE_EDGES",
  ADD_TABLE_CONNECTION = "ADD_TABLE_CONNECTION",
  SET_TABLE_SOURCE_HANDLES = "SET_TABLE_SOURCE_HANDLES",
  SET_TABLE_TARGET_HANDLES = "SET_TABLE_TARGET_HANDLES",
  SET_FIELD_NODES = "SET_FIELD_NODES",
  SET_FIELD_EDGES = "SET_FIELD_EDGES",
  ADD_FIELD_CONNECTION = "ADD_FIELD_CONNECTION",
  SET_FIELD_SOURCE_HANDLES = "SET_FIELD_SOURCE_HANDLES",
  SET_FIELD_TARGET_HANDLES = "SET_FIELD_TARGET_HANDLES",
  SET_ACTIVE_SOURCE_TABLE = "SET_ACTIVE_SOURCE_TABLE",
  SET_ACTIVE_FIELD_SOURCE_HANDLES = "SET_ACTIVE_FIELD_SOURCE_HANDLES",
  SET_ACTIVE_TARGET_TABLE = "SET_ACTIVE_TARGET_TABLE",
  SET_ACTIVE_FIELD_TARGET_HANDLES = "SET_ACTIVE_FIELD_TARGET_HANDLES",
  SET_SCANNED_SCHEMA = "SET_SCANNED_SCHEMA",
  SET_CDM_VERSION = "SET_CDM_VERSION",
  SET_CDM_TABLES = "SET_CDM_TABLES",
}

type ActionType = keyof typeof ACTION_TYPES;
type ActionFunction = (state: AppState, payload?: any) => AppState;

const actionMap = new Map<ActionType, ActionFunction>([
  [ACTION_TYPES.RESET, reset],
  [ACTION_TYPES.LOAD, load],
  [ACTION_TYPES.CLEAR_HANDLES, clearHandles],
  [ACTION_TYPES.MARK_AS_SAVED, markAsSaved],
  [ACTION_TYPES.SET_VOCABULARY_DATASET_ID, setVocabularybDatasetId],
  [ACTION_TYPES.OPEN_SAVE_MAPPING_DIALOG, openSaveMappingDialog],
  [ACTION_TYPES.OPEN_LOAD_MAPPING_DIALOG, openLoadMappingDialog],
  [ACTION_TYPES.SET_TABLE_NODES, setTableNodes],
  [ACTION_TYPES.SET_TABLE_EDGES, setTableEdges],
  [ACTION_TYPES.ADD_TABLE_CONNECTION, addTableConnection],
  [ACTION_TYPES.SET_TABLE_SOURCE_HANDLES, setTableSourceHandles],
  [ACTION_TYPES.SET_TABLE_TARGET_HANDLES, setTableTargetHandles],
  [ACTION_TYPES.SET_FIELD_NODES, setFieldNodes],
  [ACTION_TYPES.SET_FIELD_EDGES, setFieldEdges],
  [ACTION_TYPES.ADD_FIELD_CONNECTION, addFieldConnection],
  [ACTION_TYPES.SET_FIELD_SOURCE_HANDLES, setFieldSourceHandles],
  [ACTION_TYPES.SET_FIELD_TARGET_HANDLES, setFieldTargetHandles],
  [ACTION_TYPES.SET_ACTIVE_SOURCE_TABLE, setActiveSourceTable],
  [ACTION_TYPES.SET_ACTIVE_FIELD_SOURCE_HANDLES, setActiveFieldSourceHandles],
  [ACTION_TYPES.SET_ACTIVE_TARGET_TABLE, setActiveTargetTable],
  [ACTION_TYPES.SET_ACTIVE_FIELD_TARGET_HANDLES, setActiveFieldTargetHandles],
  [ACTION_TYPES.SET_SCANNED_SCHEMA, setScannedSchema],
  [ACTION_TYPES.SET_CDM_VERSION, setCdmVersion],
  [ACTION_TYPES.SET_CDM_TABLES, setCdmTables],
]);

export interface DispatchType {
  type: ACTION_TYPES;
  payload?: any;
}

export const reducer = (state: AppState, { type, payload }: DispatchType) => {
  const mappedAction = actionMap.get(type);
  return mappedAction ? mappedAction(state, payload) : state;
};
