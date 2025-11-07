import { AppState, TokenClaimState, initialState } from "../states";

export const setIdToken = (state: AppState, payload: string): AppState => ({
  ...state,
  token: {
    ...state.token,
    idToken: payload,
  },
});

export const setIdTokenClaim = (state: AppState, payload: TokenClaimState): AppState => ({
  ...state,
  token: {
    ...state.token,
    idTokenClaims: payload,
  },
});

export const clearToken = (state: AppState): AppState => ({
  ...state,
  token: initialState.token,
});
