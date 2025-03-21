import React, { FC, useCallback, useState } from "react";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import {
  Box,
  Button,
  Dialog,
  Feedback,
  IconButton,
  Tooltip,
  VisibilityOffIcon,
  VisibilityOnIcon,
} from "@portal/components";
import { CloseDialogType } from "../../../../types";
import { api } from "../../../../axios/api";
import { generateRandom } from "../../../../utils";
import "./AddUserDialog.scss";
import { useTranslation } from "../../../../contexts";

interface AddUserDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface FormData {
  username: string;
  password: string;
}

interface FormError {
  username: {
    required: boolean;
    valid: boolean;
  };
  password: {
    required: boolean;
  };
}

const EMPTY_FORM_DATA: FormData = { username: "", password: "" };

const EMPTY_FORM_ERROR: FormError = {
  username: {
    required: false,
    valid: false,
  },
  password: {
    required: false,
  },
};

const AddUserDialog: FC<AddUserDialogProps> = ({ open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [passwordShown, setPasswordShown] = useState(false);

  const isFormError = useCallback(() => {
    const { username, password } = formData;
    let formError: FormError | {} = {};
    const usernameRegex = /^\w+$/;

    if (!username) {
      formError = { ...formError, username: { required: true } };
    }

    if (!usernameRegex.test(username)) {
      formError = { ...formError, username: { valid: true } };
    }

    if (!password) {
      formError = { ...formError, password: { required: true } };
    }

    if (Object.keys(formError).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }
    return false;
  }, [formData]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleAdd = useCallback(async () => {
    if (isFormError()) {
      return;
    }

    setFormError(EMPTY_FORM_ERROR);

    try {
      setLoading(true);
      await api.userMgmt.addUser(formData.username, formData.password);
      handleClose("success");
    } catch (err: any) {
      if (err.data?.message) {
        setFeedback({ type: "error", message: err.data?.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.ADD_USER_DIALOG__ERROR),
          description: getText(i18nKeys.ADD_USER_DIALOG__ERROR_DESCRIPTION),
        });
      }
      console.error("err", err);
    } finally {
      setLoading(false);
    }
  }, [
    formData,
    isFormError,
    handleClose,
    getText,
    i18nKeys.ADD_USER_DIALOG__ERROR,
    i18nKeys.ADD_USER_DIALOG__ERROR_DESCRIPTION,
  ]);

  const handleTogglePassword = useCallback(() => {
    setPasswordShown((passwordShown) => !passwordShown);
  }, []);

  const handleGeneratePassword = useCallback(() => {
    setPasswordShown(true);
    setFormData((formData) => ({ ...formData, password: generateRandom(12) }));
  }, []);

  return (
    <Dialog
      className="add-user-dialog"
      title={getText(i18nKeys.ADD_USER_DIALOG__ADD_USER)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="add-user-dialog__content">
        <div className="u-padding-vertical--normal">
          <FormControl fullWidth>
            <TextField
              variant="standard"
              label={getText(i18nKeys.ADD_USER_DIALOG__USERNAME)}
              value={formData.username}
              onChange={(event) => setFormData((formData) => ({ ...formData, username: event.target.value }))}
              helperText={getText(i18nKeys.ADD_USER_DIALOG__USERNAME_HELPER)}
              error={formError.username.required || formError.username.valid}
            />
          </FormControl>
        </div>
        <div className="u-padding-vertical--normal">
          <FormControl fullWidth>
            <Box display="flex" alignItems="flex-end">
              <TextField
                fullWidth
                type={passwordShown ? "text" : "password"}
                variant="standard"
                label={getText(i18nKeys.ADD_USER_DIALOG__PASSWORD)}
                value={formData.password}
                onChange={(event) => setFormData((formData) => ({ ...formData, password: event.target.value }))}
                error={formError.password.required}
              />
              <Tooltip
                title={
                  passwordShown
                    ? getText(i18nKeys.ADD_USER_DIALOG__HIDE_PASSWORD)
                    : getText(i18nKeys.ADD_USER_DIALOG__SHOW_PASSWORD)
                }
              >
                <IconButton
                  startIcon={passwordShown ? <VisibilityOffIcon /> : <VisibilityOnIcon />}
                  onClick={handleTogglePassword}
                />
              </Tooltip>
              <Button
                text={getText(i18nKeys.ADD_USER_DIALOG__GENERATE)}
                variant="text"
                onClick={handleGeneratePassword}
              />
            </Box>
          </FormControl>
          {formError.password.required && (
            <FormHelperText error={true}>{getText(i18nKeys.ADD_USER_DIALOG__REQUIRED)}</FormHelperText>
          )}
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.ADD_USER_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button text={getText(i18nKeys.ADD_USER_DIALOG__ADD)} onClick={handleAdd} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default AddUserDialog;
