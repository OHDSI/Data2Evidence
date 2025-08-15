import { AppState, initialState } from "../states";

export const setDisclaimerAccepted = (state: AppState, payload: boolean): AppState => ({
  ...state,
  disclaimer: {
    ...state.disclaimer,
    isDisclaimerAccepted: payload,
  },
});

export const setShouldDisplayDisclaimer = (state: AppState, payload: boolean): AppState => ({
  ...state,
  disclaimer: {
    ...state.disclaimer,
    shouldDisplay: payload,
  },
});

export const clearDisclaimer = (state: AppState): AppState => ({
  ...state,
  disclaimer: initialState.disclaimer,
});
