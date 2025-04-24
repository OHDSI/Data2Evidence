import { AppState } from "./states";
import { clearFeedback, clearPostLoginRedirectUri, setFeedback, setPostLoginRedirectUri } from "./actions";
import { changeLocale } from "./actions/translation";
import { setActiveDatasetId, setActiveReleaseId } from "./actions/active-dataset";
import { clearToken, setIdToken, setIdTokenClaim } from "./actions/token";
import { clearUser, setUser } from "./actions/user";

export enum ACTION_TYPES {
  SET_FEEDBACK = "SET_FEEDBACK",
  CLEAR_FEEDBACK = "CLEAR_FEEDBACK",
  CHANGE_LOCALE = "CHANGE_LOCALE",
  SET_ACTIVE_DATASET_ID = "SET_ACTIVE_DATASET_ID",
  SET_ACTIVE_RELEASE_ID = "SET_ACTIVE_RELEASE_ID",
  SET_ID_TOKEN = "SET_ID_TOKEN",
  SET_ID_TOKEN_CLAIM = "SET_ID_TOKEN_CLAIM",
  CLEAR_TOKEN = "CLEAR_TOKEN",
  SET_USER = "SET_USER",
  CLEAR_USER = "CLEAR_USER",
  SET_POST_LOGIN_REDIRECT_URI = "SET_POST_LOGIN_REDIRECT_URI",
  CLEAR_POST_LOGIN_REDIRECT_URI = "CLEAR_POST_LOGIN_REDIRECT_URI",
}

type ActionType = keyof typeof ACTION_TYPES;
type ActionFunction = (state: AppState, payload?: any) => AppState;

const actionMap = new Map<ActionType, ActionFunction>([
  [ACTION_TYPES.SET_FEEDBACK, setFeedback],
  [ACTION_TYPES.CLEAR_FEEDBACK, clearFeedback],
  [ACTION_TYPES.CHANGE_LOCALE, changeLocale],
  [ACTION_TYPES.SET_ACTIVE_DATASET_ID, setActiveDatasetId],
  [ACTION_TYPES.SET_ACTIVE_RELEASE_ID, setActiveReleaseId],
  [ACTION_TYPES.SET_ID_TOKEN, setIdToken],
  [ACTION_TYPES.SET_ID_TOKEN_CLAIM, setIdTokenClaim],
  [ACTION_TYPES.CLEAR_TOKEN, clearToken],
  [ACTION_TYPES.SET_USER, setUser],
  [ACTION_TYPES.CLEAR_USER, clearUser],
  [ACTION_TYPES.SET_POST_LOGIN_REDIRECT_URI, setPostLoginRedirectUri],
  [ACTION_TYPES.CLEAR_POST_LOGIN_REDIRECT_URI, clearPostLoginRedirectUri],
]);

export interface DispatchType {
  type: ACTION_TYPES;
  payload?: any;
}

export const reducer = (state: AppState, { type, payload }: DispatchType) => {
  const mappedAction = actionMap.get(type);
  return mappedAction ? mappedAction(state, payload) : state;
};
