import React, { ChangeEvent, FC, useCallback, useState } from "react";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import {
  Box,
  Button,
  Checkbox,
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

const EMPTY_FORM_DATA: FormData = { username: "", password: "" };

const AddUserDialog: FC<AddUserDialogProps> = ({ open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [passwordShown, setPasswordShown] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleAdd = useCallback(async () => {
    if (formData.username == null) return;

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
  }, [formData, handleClose, getText]);

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
