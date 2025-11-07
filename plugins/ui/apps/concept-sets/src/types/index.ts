import { ReactNode } from "react";
import { FeedbackState, TranslationState, PortalState } from "../context/state";

export type AppState = {
  feedback: FeedbackState | undefined;
  translation: TranslationState;
  portal: PortalState;
};

export interface ConceptSetsProviderProps {
  children?: ReactNode;
}

export interface Feedback {
  type?: "error" | "success";
  message?: string;
  description?: string;
  autoClose?: number;
}

export * from "./terminology";
export * from "./concept-mapping";
