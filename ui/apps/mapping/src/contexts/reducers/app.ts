import { AppState, initialState } from "../states";
import { INIT_DIALOG_STATE } from "../states/dialog-state";

export const reset = () => initialState;

export const load = (state: AppState, payload: Partial<AppState>) => ({
  ...state,
  ...payload,
  saved: true,
  dialog: INIT_DIALOG_STATE,
});

export const clearHandles = (state: AppState) => ({
  ...state,
  saved: false,
  table: { ...state.table, edges: [] },
  field: { ...state.field, edges: [] },
});

export const markAsSaved = (state: AppState) => ({
  ...state,
  saved: true,
});

export const setVocabularybDatasetId = (state: AppState, payload: Partial<AppState>) => ({
  ...state,
  ...payload,
});
