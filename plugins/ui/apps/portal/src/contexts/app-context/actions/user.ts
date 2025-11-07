import { AppState, UserState, initialState } from "../states";

export const setUser = (state: AppState, payload: UserState): AppState => ({
  ...state,
  user: payload,
});

export const clearUser = (state: AppState): AppState => ({
  ...state,
  user: initialState.user,
});
