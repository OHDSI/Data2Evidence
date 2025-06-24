import { Page } from "../../constants";
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

export const setNodeId = (state: AppState, payload: string) => ({
  ...state,
  nodeId: payload,
});

export const setVocabularybDatasetId = (state: AppState, payload: Partial<AppState>) => ({
  ...state,
  ...payload,
});

export const setMappingSuggestion = (state: AppState, payload: boolean) => ({
  ...state,
  mappingSuggestion: payload,
});

export const setPage = (state: AppState, payload: Page) => ({
  ...state,
  page: payload,
});
