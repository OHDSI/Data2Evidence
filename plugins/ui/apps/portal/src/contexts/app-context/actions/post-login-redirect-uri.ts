import { AppState, initialState } from "../states";

export const setPostLoginRedirectUri = (state: AppState, payload: string | undefined): AppState => ({
  ...state,
  postLoginRedirectUri: payload,
});

export const clearPostLoginRedirectUri = (state: AppState): AppState => ({
  ...state,
  postLoginRedirectUri: initialState.postLoginRedirectUri,
});
