import { AppState, TranslationState } from "../states";

export const changeLocale = (state: AppState, payload: TranslationState) => {
  const translations = payload.translations || state.translation.translations;
  const locale = payload.locale || state.translation.locale;
  return {
    ...state,
    translation: { translations, locale },
  } as AppState;
};
