import React, { FC, useState, useCallback } from "react";
import { Box, Dialog, FormControl, Button, Select, MenuItem, SelectChangeEvent } from "@portal/components";
import Divider from "@mui/material/Divider";
import { Feedback } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";

import "./ChangeLanguageDialog.scss";

interface ChangeLanguageDialogProps {
  open: boolean;
  onClose?: () => void;
}

export const ChangeLanguageDialog: FC<ChangeLanguageDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const { getText, changeLocale } = useTranslation();

  const SUPPORTED_LANGUAGES = [
    { name: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__SELECT_DEFAULT), value: "default" },
    { name: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__SELECT_GERMAN), value: "de" },
    { name: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__SELECT_CHINESE), value: "zh" },
  ];

  const [language, setLangauge] = useState(SUPPORTED_LANGUAGES[0].value);

  const handleClose = useCallback(() => {
    setFeedback({});
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleUpdate = useCallback(() => {
    try {
      setLoading(true);
      changeLocale(language);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__LANGUAGE_UPDATED),
      });
    } catch {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__LANGUAGE_UPDATED_ERROR_MESSAGE),
        description: getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__LANGUAGE_UPDATED_ERROR_DESCRIPTION),
      });
    } finally {
      setLoading(false);
    }
  }, [changeLocale, language, getText]);

  const handleLanguageChange = useCallback((event: SelectChangeEvent) => {
    setLangauge(event.target.value as string);
  }, []);

  return (
    <Dialog
      className="change-language-dialog"
      title={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__DIALOG_TITLE)}
      closable
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <div className="change-language-dialog__content">
        <div className="u-padding-vertical-normal">
          <FormControl fullWidth>
            <Box display="flex" alignItems="flex-end">
              <Select fullWidth value={language} label="Language" onChange={handleLanguageChange}>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <MenuItem key={language.name} value={language.value}>
                    {language.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </FormControl>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__BUTTON_CANCEL)}
          onClick={handleClose}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.CHANGE_LANGUAGE_DIALOG__BUTTON_UPDATE)}
          onClick={handleUpdate}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};
