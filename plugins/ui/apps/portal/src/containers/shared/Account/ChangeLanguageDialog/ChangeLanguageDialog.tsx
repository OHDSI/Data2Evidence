import React, { FC, useState, useCallback, useRef } from "react";
import { Dialog, FormControl, Button, Select, MenuItem, SelectChangeEvent, Feedback } from "@portal/components";
import { useTranslation, useFeedback } from "../../../../contexts";

interface ChangeLanguageDialogProps {
  open: boolean;
  onClose?: () => void;
}

const SUPPORTED_LANGUAGES = [
  { name: "English", value: "default" },
  { name: "Deutsch", value: "de" },
  { name: "中文", value: "zh" },
];

export const ChangeLanguageDialog: FC<ChangeLanguageDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { setFeedback } = useFeedback();
  const [dialogFeedback, setDialogFeedback] = useState<Feedback>({});
  const { getText, getTextForLocale, changeLocale, locale, i18nKeys } = useTranslation();
  const [language, setLanguage] = useState(locale);

  const handleClose = useCallback(() => {
    setDialogFeedback({});
    setLanguage(locale);
    typeof onClose === "function" && onClose();
  }, [onClose, locale]);

  const handleUpdateRef = useRef<() => void>(() => undefined);
  const handleUpdate = useCallback(async () => {
    if (language === locale) {
      setDialogFeedback({ description: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__NO_CHANGES) });
      return;
    }

    setDialogFeedback({});
    setLoading(true);
    try {
      await changeLocale(language, { rethrow: true });
      setFeedback({
        variant: "alert",
        type: "success",
        message: getTextForLocale(language, i18nKeys.CHANGE_LANGUAGE_DIALOG__LANGUAGE_UPDATED_SUCCESS),
        autoClose: 5000,
      });
      typeof onClose === "function" && onClose();
    } catch {
      setDialogFeedback({
        type: "error",
        description: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__UPDATE_FAILED),
        actionLabel: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__TRY_AGAIN),
        onAction: () => handleUpdateRef.current(),
      });
    } finally {
      setLoading(false);
    }
  }, [language, locale, changeLocale, getText, getTextForLocale, setFeedback, onClose, i18nKeys]);
  handleUpdateRef.current = handleUpdate;

  const handleLanguageChange = useCallback((event: SelectChangeEvent) => {
    setDialogFeedback({});
    setLanguage(event.target.value as string);
  }, []);

  return (
    <Dialog
      className="change-language-dialog"
      title={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__DIALOG_TITLE)}
      closable
      bodyPadded
      open={open}
      onClose={handleClose}
      feedback={dialogFeedback}
      footerSlots={{
        block: true,
        secondary: (
          <Button
            text={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__BUTTON_CANCEL)}
            onClick={handleClose}
            variant="outlined"
            disabled={loading}
          />
        ),
        primary: (
          <Button
            text={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__BUTTON_UPDATE)}
            onClick={handleUpdate}
            loading={loading}
          />
        ),
      }}
    >
      <div className="change-language-dialog__content">
        <FormControl fullWidth>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Select
              fullWidth
              value={language}
              label={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__LANGUAGE)}
              onChange={handleLanguageChange}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <MenuItem key={language.name} value={language.value}>
                  {language.name}
                </MenuItem>
              ))}
            </Select>
          </div>
        </FormControl>
      </div>
    </Dialog>
  );
};
