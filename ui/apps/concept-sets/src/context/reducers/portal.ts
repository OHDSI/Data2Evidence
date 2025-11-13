import { AppState } from "../../types";
import { PortalState } from "../state";

export const setPortalData = (
  state: AppState,
  payload: Partial<PortalState>
): AppState => ({
  ...state,
  portal: {
    ...state.portal,
    ...payload,
  },
});

export const clearPortalData = (state: AppState): AppState => ({
  ...state,
  portal: {
    userName: undefined,
    userId: undefined,
    getToken: undefined,
    datasetId: undefined,
  },
});
