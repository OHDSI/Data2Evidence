import { AppState, TableSchemaState } from "../states";

export const setCdmTables = (state: AppState, payload: TableSchemaState[]): AppState => ({
  ...state,
  cdmTables: payload,
});

export const setCdmVersion = (state: AppState, payload: string): AppState => ({
  ...state,
  cdmVersion: payload,
});
