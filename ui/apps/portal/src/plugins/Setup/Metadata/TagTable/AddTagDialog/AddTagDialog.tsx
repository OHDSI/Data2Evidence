import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog, TextField } from "@portal/components";
import { api } from "../../../../../axios/api";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { CloseDialogType } from "../../../../../types";
import "./AddTagDialog.scss";

interface AddTagDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  setRefetch: React.Dispatch<React.SetStateAction<number>>;
}

interface FormData {
  name: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
};

export const AddTagDialog: FC<AddTagDialogProps> = ({ open, onClose, setRefetch }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await api.systemPortal.addDatasetTagConfig(formData);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.ADD_TAG_DIALOG__SUCCESS),
        autoClose: 6000,
      });
      setRefetch((refetch) => refetch + 1);
      setFormData(EMPTY_FORM_DATA);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data.error,
        description: err.data.message,
        autoClose: 6000,
      });
    } finally {
      setSaving(false);
    }
  }, [handleClose, formData, setRefetch, setFeedback, getText]);

  return (
    <Dialog
      className="add-tag-dialog"
      title={getText(i18nKeys.ADD_TAG_DIALOG__ADD_TAG)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <>
        <div className="add-tag-dialog__content">
          <Box mb={4}>
            <TextField
              label={getText(i18nKeys.ADD_TAG_DIALOG__TAG_NAME)}
              variant="standard"
              sx={{ width: "100%" }}
              value={formData.name}
              onChange={(event) => handleFormDataChange({ name: event.target?.value })}
            />
          </Box>
        </div>
        <div className="add-tag-dialog__footer">
          <Box display="flex" gap={1} className="add-tag-dialog__footer-actions">
            <Button
              text={getText(i18nKeys.ADD_TAG_DIALOG__CANCEL)}
              variant="outlined"
              onClick={() => handleClose("cancelled")}
            />
            <Button text={getText(i18nKeys.ADD_TAG_DIALOG__SAVE)} onClick={handleSave} loading={saving} />
          </Box>
        </div>
      </>
    </Dialog>
  );
};
