import { TableState } from "./table-state";
import { FieldMapState, FieldState } from "./field-state";
import { ScannedSchemaState, TableSchemaState } from "./scanned-schema-state";
import { DialogState, INIT_DIALOG_STATE } from "./dialog-state";
import { FIELD_SOURCE_MENU, FIELD_TARGET_MENU, Page, TABLE_SOURCE_MENU, TABLE_TARGET_MENU } from "../../constants";

export interface AppState {
  page: Page;
  saved: boolean;
  datasetSelected: string;
  mappingSuggestion: boolean;
  dialog: DialogState;
  table: TableState;
  field: FieldState;
  fieldMap: { [tableEdgeId: string]: FieldMapState };
  scannedSchema: ScannedSchemaState | undefined;
  cdmVersion: string | undefined;
  cdmTables: TableSchemaState[];
}

export const initialState: AppState = {
  page: "table",
  saved: true,
  datasetSelected: "",
  mappingSuggestion: false,
  dialog: INIT_DIALOG_STATE,
  table: {
    nodes: [
      {
        id: TABLE_SOURCE_MENU,
        type: "sourceTable",
        position: { x: 0, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "calc(100vh - 100px)",
        },
        data: null,
      },
      {
        id: TABLE_TARGET_MENU,
        type: "targetTable",
        position: { x: 700, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "calc(100vh - 100px)",
        },
        data: null,
      },
    ],
    edges: [],
    sourceHandles: [],
    targetHandles: [],
  },
  field: {
    nodes: [
      {
        id: FIELD_SOURCE_MENU,
        type: "fieldNode",
        position: { x: 0, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "calc(100vh - 100px)",
        },
        data: { type: "source" },
      },
      {
        id: FIELD_TARGET_MENU,
        type: "fieldNode",
        position: { x: 700, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "calc(100vh - 100px)",
        },
        data: { type: "target" },
      },
    ],
    edges: [],
    activeTableEdgeId: undefined,
  },
  fieldMap: {},
  scannedSchema: undefined,
  cdmVersion: undefined,
  cdmTables: [],
};
