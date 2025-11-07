import { AppState, FeedbackState, initialState } from "../states";

export const setFeedback = (state: AppState, payload: FeedbackState | undefined): AppState => ({
  ...state,
  feedback: payload,
});

export const clearFeedback = (state: AppState): AppState => ({
  ...state,
  feedback: initialState.feedback,
});
