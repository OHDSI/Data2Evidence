import { TableState } from "./table-state";
import { FieldState } from "./field-state";
import { ScannedSchemaState, TableSchemaState } from "./scanned-schema-state";
import { DialogState, INIT_DIALOG_STATE } from "./dialog-state";

export interface AppState {
  saved: boolean;
  datasetSelected: string;
  dialog: DialogState;
  table: TableState;
  field: FieldState;
  scannedSchema: ScannedSchemaState | undefined;
  cdmVersion: string | undefined;
  cdmTables: TableSchemaState[];
}

export const initialState: AppState = {
  saved: true,
  datasetSelected: "",
  dialog: INIT_DIALOG_STATE,
  table: {
    nodes: [
      {
        id: "table_source_menu",
        type: "sourceTable",
        position: { x: 0, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "100vh",
        },
        data: null,
      },
      {
        id: "table_target_menu",
        type: "targetTable",
        position: { x: 700, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "100vh",
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
        id: "field_source_menu",
        type: "fieldNode",
        position: { x: 0, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "100vh",
        },
        data: { type: "source" },
      },
      {
        id: "field_target_menu",
        type: "fieldNode",
        position: { x: 700, y: 0 },
        style: {
          width: "30vw",
          maxWidth: "600px",
          height: "100vh",
        },
        data: { type: "target" },
      },
    ],
    edges: [],
    sourceHandles: {},
    targetHandles: {},
    activeSourceTable: undefined,
    activeTargetTable: undefined,
  },
  scannedSchema: undefined,
  cdmVersion: undefined,
  cdmTables: [],
};
