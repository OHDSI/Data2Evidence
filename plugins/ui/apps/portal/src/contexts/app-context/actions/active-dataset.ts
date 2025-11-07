import { AppState } from "../states";

export const setActiveDatasetId = (state: AppState, payload: string): AppState => ({
  ...state,
  activeDataset: {
    ...state.activeDataset,
    id: payload,
  },
});

export const setActiveReleaseId = (state: AppState, payload: string): AppState => ({
  ...state,
  activeDataset: {
    ...state.activeDataset,
    releaseId: payload,
  },
});
