import React, { FC, useCallback, useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import {
  Box,
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
import { useTranslation } from "../../../../contexts";

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
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  useEffect(() => {
    setFormData(EMPTY_FORM_DATA);
    setFeedback({});
    setLoading(false);
  }, [open]);

  const handleClose = useCallback(() => {
    setFeedback({});
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
        type: "success",
        message: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__PASSWORD_UPDATED),
      });
    } catch (err: any) {
      if (err?.data?.message) {
        setFeedback({ type: "error", message: err?.data?.message });
      } else {
        console.log("There is an error in updating user's password", err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__ERROR),
          description: getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, formData.password, getText]);

  return (
    <Dialog
      className="change-user-password-dialog"
      title={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__CHANGE_USER_PASSWORD)}
      closable
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <Divider />
      <div className="change-user-password-dialog__content">
        <div className="u-padding-vertical--normal">
          <FormControl fullWidth>
            <Box display="flex" alignItems="flex-end">
              <TextField
                fullWidth
                type={passwordShown ? "text" : "password"}
                variant="standard"
                label={getText(i18nKeys.CHANGE_USER_PASSWORD_DIALOG__PASSWORD)}
                value={formData.password}
                onChange={(event) => setFormData((formData) => ({ ...formData, password: event.target.value }))}
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
            </Box>
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
        />
      </div>
    </Dialog>
  );
};
