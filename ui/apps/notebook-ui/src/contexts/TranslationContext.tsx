import React, { createContext, FC, ReactNode, useContext } from "react";
import i18n from "i18next";
import { initReactI18next, useTranslation as useI18nextTranslation } from "react-i18next";

// Starboard-specific translation keys
export const translations = {
  en: {
    translation: {
      // Starboard translations
      STARBOARD__ERROR_CREATE: "An error has occurred while creating a new notebook",
      STARBOARD__ERROR_FETCH: "An error has occurred while fetching notebooks",
      STARBOARD__ERROR_IMPORT: "An error has occurred. Please import Jupyter files(.ipynb) only.",
      STARBOARD__SUCCESS_CREATE_NOTEBOOK: 'Created notebook "{0}"',
      STARBOARD__SUCCESS_CREATE_FROM_TEMPLATE: 'Created notebook "{0}" from template',
      STARBOARD__ERROR_CREATE_FROM_TEMPLATE: "Failed to create notebook from template",
      STARBOARD__ERROR_LOAD_TEMPLATES: "Failed to load notebook templates",
      STARBOARD__ERROR_NOTEBOOK_NAME_REQUIRED: "Please enter a notebook name",
      STARBOARD__SUCCESS_SYNC_FROM_REMOTE: "Successfully synced notebook from remote",
      STARBOARD__ERROR_SYNC_FROM_REMOTE: "Failed to sync from remote",
      STARBOARD__NEW_NOTEBOOK_DIALOG_TITLE: "New notebook",
      STARBOARD__NEW_NOTEBOOK_NAME_LABEL: "Name",
      STARBOARD__NEW_NOTEBOOK_NAME_PLACEHOLDER: "Enter notebook name",
      STARBOARD__NEW_NOTEBOOK_NAME__ALREADY_EXISTS: "The notebook title already exists. Please enter a different title.",
      STARBOARD__NEW_NOTEBOOK_TEMPLATE_LABEL: "Template (Optional)",
      STARBOARD__NEW_NOTEBOOK_NO_TEMPLATE: "No template",
      STARBOARD__NEW_NOTEBOOK_CANCEL: "Cancel",
      STARBOARD__NEW_NOTEBOOK_CREATE: "Create",
      STARBOARD__SYNC_FROM_REMOTE_BUTTON: "Sync from Remote",
      STARBOARD__SYNCING_BUTTON: "Syncing...",

      // Header translations
      HEADER__DELETE: "Delete",
      HEADER__DOWNLOAD: "Download source code",
      HEADER__ERROR_DELETE: "An error has occurred while deleting notebook",
      HEADER__ERROR_SAVED: "An error has occurred while saving notebook",
      HEADER__EXPORT: "Export Notebook",
      HEADER__FILE_DELETED: "File Deleted",
      HEADER__IMPORT_ERROR: "An error has occurred. Please import Jupyter files(.ipynb) only.",
      HEADER__IMPORT: "Import Notebook",
      HEADER__NEW: "New Notebook",
      HEADER__RENAME_ERROR: "An error has occurred. Please try again.",
      HEADER__RENAME_SUCCESS: "Changes saved",
      HEADER__SAVE: "Save",
      HEADER__SAVED: "Changes saved",
      HEADER__SHARE: "Share notebook",

      // Edit title dialog
      EDIT_TITLE_DIALOG__ALREADY_EXISTS: "The notebook title already exists. Please enter a different title.",
      EDIT_TITLE_DIALOG__CANCEL: "Cancel",
      EDIT_TITLE_DIALOG__EDIT_NOTEBOOK_TITLE: "Edit Notebook Title",
      EDIT_TITLE_DIALOG__NOTEBOOK_TITLE: "Notebook Title",
      EDIT_TITLE_DIALOG__SAVE: "Save",

      // Delete notebook dialog
      DELETE_NOTEBOOK_DIALOG__CANCEL: "Cancel",
      DELETE_NOTEBOOK_DIALOG__CONFIRM: "Are you sure you want to delete the following notebook",
      DELETE_NOTEBOOK_DIALOG__DELETE_NOTEBOOK: "Delete notebook",
      DELETE_NOTEBOOK_DIALOG__DELETE: "Delete",

      // Empty notebook
      EMPTY_NOTEBOOK__ADD: "Add New Notebook",
      EMPTY_NOTEBOOK__IMPORT: "Import Notebook",
      EMPTY_NOTEBOOK__TITLE: "ALP Notebook",

      // Notebook select
      NOTEBOOK_SELECT__SHARED: "(Shared)",
    },
  },
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: translations,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

interface TranslationContextValue {
  getText: (key: string, args?: (string | number)[]) => string;
  locale: string;
  setLocale: (locale: string) => void;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export const TranslationProvider: FC<{ children: ReactNode; locale?: string }> = ({ children, locale = "en" }) => {
  const { t, i18n } = useI18nextTranslation();

  const getText = (key: string, args?: (string | number)[]): string => {
    let translated = t(key);

    // Replace placeholders {0}, {1}, etc. with args
    if (args) {
      args.forEach((arg, index) => {
        translated = translated.replace(`{${index}}`, String(arg));
      });
    }

    return translated;
  };

  const setLocale = (newLocale: string) => {
    i18n.changeLanguage(newLocale);
  };

  React.useEffect(() => {
    if (locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <TranslationContext.Provider value={{ getText, locale: i18n.language, setLocale }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

// Export translation keys for type-safe access
export const i18nKeys = Object.keys(translations.en.translation).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {} as Record<string, string>);
