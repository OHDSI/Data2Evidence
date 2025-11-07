import { AppState } from "../../types";
import { initialState } from "../ConceptSetsContext";
import { FeedbackState } from "../state";

export const setFeedback = (
  state: AppState,
  payload: FeedbackState | undefined
): AppState => ({
  ...state,
  feedback: payload,
});

export const clearFeedback = (state: AppState): AppState => ({
  ...state,
  feedback: initialState.feedback,
});
