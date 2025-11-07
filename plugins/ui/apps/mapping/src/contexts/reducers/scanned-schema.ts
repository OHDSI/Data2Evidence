import { AppState } from "../states";
import { ScannedSchemaState } from "../states/scanned-schema-state";

export const setScannedSchema = (
  state: AppState,
  payload: ScannedSchemaState
): AppState => ({
  ...state,
  scannedSchema: payload,
});
