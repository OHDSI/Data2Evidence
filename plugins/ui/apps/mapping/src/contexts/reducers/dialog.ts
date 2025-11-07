import { AppState } from "../states";

export const openSaveMappingDialog = (state: AppState, payload: boolean) => ({
  ...state,
  dialog: {
    ...state.dialog,
    saveMappingDialogVisible: payload,
  },
});

export const openLoadMappingDialog = (state: AppState, payload: boolean) => ({
  ...state,
  dialog: {
    ...state.dialog,
    loadMappingDialogVisible: payload,
  },
});
