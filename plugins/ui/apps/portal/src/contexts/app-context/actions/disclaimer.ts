import { AppState, initialState } from "../states";
import { clearDisclaimerAcceptance } from "../../../utils/disclaimerStorage";

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

export const clearDisclaimer = (state: AppState): AppState => {
  // Clear localStorage when clearing disclaimer state
  clearDisclaimerAcceptance();
  return {
    ...state,
    disclaimer: initialState.disclaimer,
  };
};
