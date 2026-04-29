import { AppState } from "../../types";
import { clearFeedback, setFeedback } from "./feedback";
import { changeLocale } from "./translation";
import { setPortalData, clearPortalData } from "./portal";

export enum ACTION_TYPES {
  SET_FEEDBACK = "SET_FEEDBACK",
  CLEAR_FEEDBACK = "CLEAR_FEEDBACK",
  CHANGE_LOCALE = "CHANGE_LOCALE",
  SET_PORTAL_DATA = "SET_PORTAL_DATA",
  CLEAR_PORTAL_DATA = "CLEAR_PORTAL_DATA",
}

type ActionType = keyof typeof ACTION_TYPES;
type ActionFunction = (state: AppState, payload?: any) => AppState;

const actionMap = new Map<ActionType, ActionFunction>([
  [ACTION_TYPES.SET_FEEDBACK, setFeedback],
  [ACTION_TYPES.CLEAR_FEEDBACK, clearFeedback],
  [ACTION_TYPES.CHANGE_LOCALE, changeLocale],
  [ACTION_TYPES.SET_PORTAL_DATA, setPortalData],
  [ACTION_TYPES.CLEAR_PORTAL_DATA, clearPortalData],
]);

export interface DispatchType {
  type: ACTION_TYPES;
  payload?: any;
}

export const reducer = (state: AppState, { type, payload }: DispatchType) => {
  const mappedAction = actionMap.get(type);
  return mappedAction ? mappedAction(state, payload) : state;
};
