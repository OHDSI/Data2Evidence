import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { Button, Dialog, FormControl, InputLabel, TextField } from "@portal/components";
import React, { FC, FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../../../../../axios/api";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { CloseDialogType, DatasetAttributeConfig } from "../../../../../types";
import "./SaveAttributeDialog.scss";

interface SaveAttributeDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  attribute?: DatasetAttributeConfig;
  setRefetch: React.Dispatch<React.SetStateAction<number>>;
}

const ATTRIBUTE_CATEGORIES = ["DATASET", "FILE"];
const ATTRIBUTE_DATATYPES = ["STRING", "NUMBER", "TIMESTAMP"];

interface FormData {
  id: string;
  name: string;
  category: string;
  dataType: string;
  isDisplayed: boolean;
}

const EMPTY_FORM_DATA: FormData = {
  id: "",
  name: "",
  category: ATTRIBUTE_CATEGORIES[0],
  dataType: ATTRIBUTE_DATATYPES[0],
  isDisplayed: true,
};

export const SaveAttributeDialog: FC<SaveAttributeDialogProps> = ({ open, onClose, attribute, setRefetch }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [saving, setSaving] = useState(false);

  // If attribute is provided, it means that form will be in edit mode
  const isEditMode = attribute ? true : false;
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);

  useEffect(() => {
    setFormData(attribute ? attribute : EMPTY_FORM_DATA);
  }, [attribute, open]);

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
      try {
        setSaving(true);
        if (isEditMode) {
          await api.systemPortal.updateDatasetAttributeConfig(formData);
        } else {
          await api.systemPortal.addDatasetAttributeConfig(formData);
        }
        setFeedback({
          type: "success",
          message: getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__SUCCESS),
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
    [handleClose, formData, setRefetch, setFeedback, isEditMode, getText]
  );

  return (
    <Dialog
      className="save-attribute-dialog"
      title={isEditMode ? getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__EDIT) : getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__ADD)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <form onSubmit={handleSave}>
        <div className="save-attribute-dialog__content">
          <div style={{ marginBottom: "32px" }}>
            <TextField
              label={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__ATTRIBUTE_ID)}
              variant="standard"
              sx={{ width: "100%" }}
              disabled={isEditMode}
              value={formData.id}
              onChange={(event) => handleFormDataChange({ id: event.target?.value })}
            />
          </div>
          <div style={{ marginBottom: "32px" }}>
            <TextField
              label={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__ATTRIBUTE_NAME)}
              variant="standard"
              sx={{ width: "100%" }}
              value={formData.name}
              onChange={(event) => handleFormDataChange({ name: event.target?.value })}
            />
          </div>
          <div style={{ marginBottom: "32px" }}>
            <FormControl fullWidth>
              <InputLabel id="category-select-label">{getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__CATEGORY)}</InputLabel>
              <Select
                labelId="category-select-label"
                label={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__CATEGORY)}
                id="category-select"
                value={formData.category}
                onChange={(event) => handleFormDataChange({ category: event.target?.value })}
              >
                {ATTRIBUTE_CATEGORIES.map((category) => (
                  <MenuItem value={category} key={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div style={{ marginBottom: "32px" }}>
            <FormControl fullWidth>
              <InputLabel id="datatype-select-label">{getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__DATATYPE)}</InputLabel>
              <Select
                labelId="datatype-select-label"
                label={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__DATATYPE)}
                id="datatype-select"
                value={formData.dataType}
                onChange={(event) => handleFormDataChange({ dataType: event.target?.value })}
              >
                {ATTRIBUTE_DATATYPES.map((dataType) => (
                  <MenuItem value={dataType} key={dataType}>
                    {dataType}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
        <div className="save-attribute-dialog__footer">
          <div style={{ display: "flex", gap: "8px" }} className="save-attribute-dialog__footer-actions">
            <Button
              text={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__CANCEL)}
              variant="outlined"
              onClick={() => handleClose("cancelled")}
            />
            <Button type="submit" text={getText(i18nKeys.SAVE_ATTRIBUTE_DIALOG__SAVE)} loading={saving} />
          </div>
        </div>
      </form>
    </Dialog>
  );
};
