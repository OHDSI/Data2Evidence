import { DatasetState } from "./active-dataset-state";
import { FeedbackState } from "./feedback-state";
import { TranslationState, i18nDefault } from "./translation-state";
import { TokenState } from "./token-state";
import { UserState } from "./user-state";

export interface AppState {
  feedback: FeedbackState | undefined;
  translation: TranslationState;
  activeDataset: DatasetState;
  postLoginRedirectUri: string | undefined;

  // auth data
  token: TokenState;
  user: UserState;
}

export const initialState: AppState = {
  feedback: undefined,
  translation: {
    locale: "default",
    translations: i18nDefault,
  },
  activeDataset: {
    id: "",
    releaseId: "",
  },
  postLoginRedirectUri: undefined,
  token: {
    idToken: null,
    idTokenClaims: {
      sub: null,
      oid: null,
      name: null,
      username: null,
      email: null,
      exp: 0,
    },
  },
  user: {
    userId: null,
    idpUserId: null,
    canAccessSystemAdminPortal: false,
    canAccessResearcherPortal: false,
    isResearcher: false,
    isUserAdmin: false,
    isSystemAdmin: false,
    isDashboardViewer: false,
    isDatasetResearcher: {},
  },
};
