import { ConceptMappingState } from "../../types";
import { TranslationState } from "../state";

export const changeLocale = (state: ConceptMappingState, payload: TranslationState) => {
  const translations = payload.translations || state.translation.translations;
  const locale = payload.locale || state.translation.locale;
  return {
    ...state,
    translation: { translations, locale },
  } as ConceptMappingState;
};
