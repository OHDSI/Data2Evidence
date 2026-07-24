import React, { FC, useCallback, useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import {
  Button,
  Dialog,
  IconButton,
  TextField,
  Tooltip,
  VisibilityOffIcon,
  VisibilityOnIcon,
} from "@portal/components";
import { Feedback } from "../../../../types";
import { generateRandom } from "../../../../utils";
import { api } from "../../../../axios/api";
import "./ChangeUserPassword.scss";
import { useFeedback, useTranslation } from "../../../../contexts";

interface ChangeUserPasswordDialogProps {
  userId: string;
  open: boolean;
  onClose?: () => void;
}

interface FormData {
  password: string;
}

const EMPTY_FORM_DATA: FormData = { password: "" };

export const ChangeUserPasswordDialog: FC<ChangeUserPasswordDialogProps> = ({ userId, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [dialogFeedback, setDialogFeedback] = useState<Feedback>({});

  useEffect(() => {
    setFormData(EMPTY_FORM_DATA);
    setDialogFeedback({});
    setPasswordShown(false);
    setLoading(false);
  }, [open]);

  const handleClose = useCallback(() => {
    setDialogFeedback({});
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleTogglePassword = useCallback(() => {
    setPasswordShown((passwordShown) => !passwordShown);
  }, []);

  const handleGeneratePassword = useCallback(() => {
    setPasswordShown(true);
    setFormData((formData) => ({ ...formData, password: generateRandom(12) }));
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      await api.userMgmt.changeUserPassword(userId, formData.password);
      setFeedback({
        variant: "alert",
        type: "success",
        message: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__PASSWORD_UPDATED),
        autoClose: 5000,
      });
      typeof onClose === "function" && onClose();
    } catch (err: any) {
      console.log("There is an error in updating user's password", err);
      setDialogFeedback({
        type: "error",
        title: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__ERROR),
        message: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__ERROR_DESCRIPTION),
      });
    } finally {
      setLoading(false);
    }
  }, [userId, formData.password, getText, setFeedback, onClose, i18nKeys]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleUpdate();
    },
    [handleUpdate]
  );

  return (
    <Dialog
      className="change-user-password-dialog"
      title={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__CHANGE_USER_PASSWORD)}
      closable
      open={open}
      onClose={handleClose}
      feedback={dialogFeedback}
    >
      <form onSubmit={handleSubmit}>
        <Divider />
        <div className="change-user-password-dialog__content">
        <div className="u-padding-vertical--normal">
          <FormControl fullWidth>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <TextField
                fullWidth
                type={passwordShown ? "text" : "password"}
                variant="standard"
                label={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__PASSWORD)}
                value={formData.password}
                onChange={(event) => setFormData((formData) => ({ ...formData, password: event.target.value }))}
                autoFocus
              />
              <Tooltip
                title={
                  passwordShown
                    ? getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__HIDE_PASSWORD)
                    : getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__SHOW_PASSWORD)
                }
              >
                <IconButton
                  startIcon={passwordShown ? <VisibilityOffIcon /> : <VisibilityOnIcon />}
                  onClick={handleTogglePassword}
                />
              </Tooltip>
              <Button
                text={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__GENERATE)}
                variant="text"
                onClick={handleGeneratePassword}
              />
            </div>
          </FormControl>
        </div>
        </div>
        <Divider />
        <div className="button-group-actions">
          <Button
            text={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__CANCEL)}
            onClick={handleClose}
            variant="outlined"
            block
            disabled={loading}
          />
          <Button
            text={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__UPDATE)}
            onClick={handleUpdate}
            block
            loading={loading}
            type="submit"
          />
        </div>
      </form>
    </Dialog>
  );
};
