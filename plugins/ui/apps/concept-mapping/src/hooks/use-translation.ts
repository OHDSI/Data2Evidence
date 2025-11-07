import { useCallback, useContext } from "react";
import { ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { i18nDefault, i18nKeys } from "../Context/state";
import { ACTION_TYPES } from "../Context/reducers/reducer";
import { AxiosError } from "axios";
import { api } from "../axios/api";
import { ConceptMappingContext } from "../Context/ConceptMappingContext";

type LanguageMappings = {
  [key in keyof typeof i18nKeys]: string;
};

export const useTranslation = (): {
  changeLocale: (newLocale: string) => void;
  getText: (phraseKey: keyof LanguageMappings, params?: string[]) => string;
  locale: string;
} => {
  const { translation } = useContext(ConceptMappingContext);
  const dispatch = useContext(ConceptMappingDispatchContext);
  const { translations } = translation;
  const changeLocale = (newLocale: string): void => {
    const getTranslation = async (localeToGet: string) => {
      if (localeToGet in translations) {
        dispatch({
          type: ACTION_TYPES.CHANGE_LOCALE,
          payload: { locale: localeToGet, translations },
        });
        return;
      }
      try {
        const newTranslation = await api.translation.getTranslation(localeToGet);
        const newTranslations = { ...i18nDefault.default, ...newTranslation.data };
        const updatedTranslations = JSON.parse(JSON.stringify(translations)) as typeof translations;
        updatedTranslations[localeToGet] = newTranslations;
        dispatch({
          type: ACTION_TYPES.CHANGE_LOCALE,
          payload: { locale: localeToGet, translations: updatedTranslations },
        });
      } catch (e: any) {
        if (e instanceof AxiosError && e.response?.status === 404) {
          const fallbackLocale = getFallbackLocale(localeToGet);
          console.log(`Locale "${localeToGet}" not found, trying fallback locale "${fallbackLocale}"`);
          getTranslation(fallbackLocale);
          return;
        }
        dispatch({
          type: ACTION_TYPES.CHANGE_LOCALE,
          payload: { locale: "default", translations: translations },
        });
      }
    };
    getTranslation(newLocale);
  };

  // Temporarily exposing function for demo. Remove when language selector is added
  //@ts-ignore
  window.changeLocale = changeLocale;

  const getText = useCallback(
    (phraseKey: keyof LanguageMappings, params?: string[]) => {
      const values = translations?.[translation.locale] ?? translations.default;
      const phrase = values[phraseKey] ?? translations.default[phraseKey] ?? phraseKey;
      const text = replaceParams(phrase, params);
      return text;
    },
    [translations, translation.locale]
  );

  return { getText, changeLocale, locale: translation.locale };
};

const getFallbackLocale = (locale: string) => {
  const arr = locale.split("-");
  if (arr.length === 1) {
    return "default";
  }
  const fallbackLocale = arr.slice(0, arr.length - 1).join("-");
  return fallbackLocale;
};

const replaceParams = (phrase: string, params?: string[]) => {
  if (!params?.length) {
    return phrase;
  }
  let text = phrase;
  if (Array.isArray(params)) {
    for (let i = 0; i < params.length; i += 1) {
      text = text.replace(`{${i}}`, params[i]);
    }
  }
  return text;
};
