import { useCallback, useContext, useRef } from "react";
import { AppContext, AppDispatchContext } from "../..";
import { ACTION_TYPES } from "../reducer";
import { i18nDefault, i18nKeys } from "../states";
import { AxiosError } from "axios";
import { api } from "../../../axios/api";
import { getFallbackLocale, replaceParams } from "../helpers";

export type LanguageMappings = {
  [key in keyof typeof i18nKeys]: string;
};

interface ChangeLocaleOptions {
  // When set, non-404 errors are rethrown instead of silently falling back to the
  // default locale — lets callers (e.g. the language dialog) detect failures.
  rethrow?: boolean;
}

export const useTranslation = (): {
  i18nKeys: typeof i18nKeys;
  changeLocale: (newLocale: string, options?: ChangeLocaleOptions) => Promise<void>;
  getText: (phraseKey: keyof LanguageMappings, params?: string[]) => string;
  getTextForLocale: (targetLocale: string, phraseKey: keyof LanguageMappings, params?: string[]) => string;
  locale: string;
} => {
  const { translation } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);
  const { translations } = translation;

  // Mirror the latest translations so getTextForLocale and the fresh-fetch path can
  // read newly-loaded bundles synchronously (before the dispatch-driven re-render).
  const translationsRef = useRef(translations);
  translationsRef.current = translations;

  const changeLocale = useCallback(
    async (newLocale: string, options?: ChangeLocaleOptions): Promise<void> => {
      const current = translationsRef.current;
      if (newLocale in current) {
        console.log(`Using cached version of locale ${newLocale}`);
        dispatch({ type: ACTION_TYPES.CHANGE_LOCALE, payload: { locale: newLocale, translations: current } });
        return;
      }
      try {
        const newTranslation = await api.translation.getTranslation(newLocale);
        const newTranslations = { ...i18nDefault.default, ...newTranslation.data };
        const updatedTranslations = { ...translationsRef.current, [newLocale]: newTranslations };
        translationsRef.current = updatedTranslations; // available immediately after await
        console.log(`Using translations for "${newLocale}"`);
        dispatch({
          type: ACTION_TYPES.CHANGE_LOCALE,
          payload: { locale: newLocale, translations: updatedTranslations },
        });
      } catch (e: any) {
        if (e instanceof AxiosError && e.response?.status === 404) {
          const fallbackLocale = getFallbackLocale(newLocale);
          if (fallbackLocale !== newLocale) {
            console.log(`Locale "${newLocale}" not found, trying fallback locale "${fallbackLocale}"`);
            return await changeLocale(fallbackLocale, options);
          }
          console.log(`Locale "${newLocale}" not found and has no further fallback`);
        }
        if (options?.rethrow) throw e;
        dispatch({ type: ACTION_TYPES.CHANGE_LOCALE, payload: { locale: "default", translations: current } });
      }
    },
    [dispatch]
  );

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

  // Resolve a phrase in an explicit locale (e.g. the success toast in the newly
  // selected language). Reads the ref so it is safe to call right after changeLocale.
  const getTextForLocale = useCallback((targetLocale: string, phraseKey: keyof LanguageMappings, params?: string[]) => {
    const all = translationsRef.current;
    const values = all?.[targetLocale] ?? all.default;
    const phrase = values[phraseKey] ?? all.default[phraseKey] ?? phraseKey;
    return replaceParams(phrase, params);
  }, []);

  return { getText, getTextForLocale, changeLocale, i18nKeys, locale: translation.locale };
};
