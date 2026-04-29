import { ConceptMappingState } from "../../types";
import { initialState } from "../ConceptMappingContext";
import { FeedbackState } from "../state";

export const setFeedback = (state: ConceptMappingState, payload: FeedbackState | undefined): ConceptMappingState => ({
  ...state,
  feedback: payload,
});

export const clearFeedback = (state: ConceptMappingState): ConceptMappingState => ({
  ...state,
  feedback: initialState.feedback,
});
