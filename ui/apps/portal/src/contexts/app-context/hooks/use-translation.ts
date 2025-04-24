import { useCallback, useContext, useEffect } from "react";
import { AppContext, AppDispatchContext } from "../..";
import { ACTION_TYPES } from "../reducer";
import { i18nDefault, i18nKeys } from "../states";
import { AxiosError } from "axios";
import { api } from "../../../axios/api";
import { getFallbackLocale, replaceParams } from "../helpers";
import env from "../../../env";

type LanguageMappings = {
  [key in keyof typeof i18nKeys]: string;
};

export const useTranslation = (): {
  i18nKeys: typeof i18nKeys;
  changeLocale: (newLocale: string) => void;
  getText: (phraseKey: keyof LanguageMappings, params?: string[]) => string;
  locale: string;
} => {
  const { translation } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);
  const { translations } = translation;
  const changeLocale = (newLocale: string): void => {
    const getTranslation = async (localeToGet: string) => {
      if (localeToGet in translations) {
        console.log(`Using cached version of locale ${localeToGet}`);
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
        console.log(`Using translations for "${localeToGet}"`);
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

  return { getText, changeLocale, i18nKeys, locale: translation.locale };
};
