import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { FormHelperText } from "@mui/material";
import { Box, Button, Dialog, Feedback, TextField } from "@portal/components";
import { CloseDialogType } from "../../../../types";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./TrexPluginInstallDialog.scss";

interface TrexPluginInstallDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface FormError {
  required: boolean;
}

const EMPTY_FORM_ERROR: FormError = {
  required: false,
};

const TrexPluginInstallDialog: FC<TrexPluginInstallDialogProps> = ({ open, onClose }) => {
  const { getText } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);

  const isFormError = useCallback(() => {
    let formError: FormError | {} = {};

    if (!name) {
      formError = { ...formError, required: true };
    }

    if (Object.keys(formError).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }

    return false;
  }, [name]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setFormError(EMPTY_FORM_ERROR);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleInstall = useCallback(async () => {
    if (isFormError()) {
      return;
    }

    setFeedback({});
    setFormError(EMPTY_FORM_ERROR);

    try {
      setLoading(true);
      await api.trex.installPlugin(name);
      handleClose("success");
    } catch (err: any) {
      console.error("err", err);
      if (err?.data) {
        setFeedback({ type: "error", message: err?.data });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__ERROR),
          description: getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [handleClose, getText, name]);

  return (
    <Dialog
      className="trex-plugin-install-dialog"
      title={getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="trex-plugin-install-dialog__content">
        <Box my={6}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__NAME)}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={formError.required}
          />
          {formError.required && (
            <FormHelperText error={true}>{getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)}</FormHelperText>
          )}
        </Box>
      </div>

      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.TREX_PLUGIN_INSTALL_DIALOG__INSTALL)}
          onClick={handleInstall}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default TrexPluginInstallDialog;
