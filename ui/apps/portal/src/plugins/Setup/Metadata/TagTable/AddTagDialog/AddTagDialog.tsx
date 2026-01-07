import Divider from "@mui/material/Divider";
import { Button, Dialog, TextField } from "@portal/components";
import React, { FC, FormEvent, useCallback, useState } from "react";
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

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      
      const trimmedName = formData.name.trim();
      
      if (!trimmedName) {
        return;
      }
      
      try {
        setSaving(true);
        await api.systemPortal.addDatasetTagConfig({ name: trimmedName });
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
          message: err.data?.error || err.message || "An error occurred",
          description: err.data?.message || "",
          autoClose: 6000,
        });
      } finally {
        setSaving(false);
      }
    },
    [handleClose, formData, setRefetch, setFeedback, getText]
  );

  return (
    <Dialog
      className="add-tag-dialog"
      title={getText(i18nKeys.ADD_TAG_DIALOG__ADD_TAG)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <form onSubmit={handleSave}>
        <div className="add-tag-dialog__content">
          <div style={{ marginBottom: "32px" }}>
            <TextField
              label={getText(i18nKeys.ADD_TAG_DIALOG__TAG_NAME)}
              variant="standard"
              sx={{ width: "100%" }}
              value={formData.name}
              onChange={(event) => handleFormDataChange({ name: event.target?.value })}
              autoFocus
            />
          </div>
        </div>
        <div className="add-tag-dialog__footer">
          <div style={{ display: "flex", gap: "8px" }} className="add-tag-dialog__footer-actions">
            <Button
              text={getText(i18nKeys.ADD_TAG_DIALOG__CANCEL)}
              variant="outlined"
              onClick={() => handleClose("cancelled")}
            />
            <Button 
              type="submit" 
              text={getText(i18nKeys.ADD_TAG_DIALOG__SAVE)} 
              loading={saving}
              disabled={!formData.name.trim()}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
};
