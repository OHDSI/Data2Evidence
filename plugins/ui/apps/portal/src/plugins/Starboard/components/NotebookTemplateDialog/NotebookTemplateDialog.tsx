import { Button, Dialog, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@portal/components";
import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { api } from "../../../../axios/api";
import { NotebookTemplateDto } from "../../../../axios/study-notebook";
import { useFeedback, useTranslation } from "../../../../contexts";
import { StarboardNotebook } from "../../utils/notebook";
import "./NotebookTemplateDialog.scss";

interface NotebookTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateBlank: (name: string) => void;
  onCreateFromTemplate: (templateId: string, name: string) => void;
  activeDatasetId: string;
  notebooks: StarboardNotebook[] | undefined;
}

interface FormData {
  name: string;
  selectedTemplate: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  selectedTemplate: "",
};

export const NotebookTemplateDialog: FC<NotebookTemplateDialogProps> = ({
  open,
  onClose,
  onCreateBlank,
  onCreateFromTemplate,
  activeDatasetId,
  notebooks,
}) => {
  const { setFeedback } = useFeedback();
  const { getText, i18nKeys } = useTranslation();
  const [templates, setTemplates] = useState<NotebookTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setFormData(EMPTY_FORM_DATA);
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templateList = await api.studyNotebook.getTemplates(activeDatasetId);
      setTemplates(templateList);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const onFormDataChange = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const isDuplicateName = useCallback(
    (name: string): boolean => {
      return notebooks?.some((nb) => nb.name.toUpperCase() === name.toUpperCase()) ?? false;
    },
    [notebooks]
  );

  const handleCreate = useCallback(() => {
    if (!formData.name.trim()) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STARBOARD__ERROR_NOTEBOOK_NAME_REQUIRED),
      });
      return;
    }
    if (isDuplicateName(formData.name)) {
      setShowErrorMessage(true);
      return;
    }

    if (formData.selectedTemplate) {
      onCreateFromTemplate(formData.selectedTemplate, formData.name.trim());
    } else {
      // Create blank notebook with custom name
      onCreateBlank(formData.name.trim());
    }
    onClose();
  }, [formData, onCreateFromTemplate, onCreateBlank, onClose, setFeedback, isDuplicateName]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog
      className="notebook-template-dialog"
      title={getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_DIALOG_TITLE)}
      closable
      open={open}
      onClose={onClose}
      maxWidth="md"
    >
      <div className="notebook-template-dialog__content">
        <div style={{ marginBottom: "32px" }}>
          <TextField
            label={getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_NAME_LABEL)}
            sx={{ width: "100%" }}
            variant="standard"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFormDataChange({ name: e.target.value })}
            placeholder={getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_NAME_PLACEHOLDER)}
          />
          {showErrorMessage && (
            <div className="notebook-template-dialog__content__error">
              {getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_NAME__ALREADY_EXISTS)}
            </div>
          )}
        </div>
        <div style={{ marginBottom: "32px" }}>
          <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_TEMPLATE_LABEL)}</InputLabel>
          <Select
            sx={{ width: "100%" }}
            variant="standard"
            value={formData.selectedTemplate}
            onChange={(e: SelectChangeEvent) => onFormDataChange({ selectedTemplate: e.target.value })}
            displayEmpty
            disabled={loading}
          >
            <MenuItem value="">
              <em>{getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_NO_TEMPLATE)}</em>
            </MenuItem>
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} - {template.description}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>
      <div className="notebook-template-dialog__footer">
        <div style={{ display: "flex", gap: "8px" }} className="notebook-template-dialog__footer-actions">
          <Button text={getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_CANCEL)} variant="outlined" onClick={handleClose} />
          <Button
            text={getText(i18nKeys.STARBOARD__NEW_NOTEBOOK_CREATE)}
            onClick={handleCreate}
            disabled={!formData.name.trim()}
          />
        </div>
      </div>
    </Dialog>
  );
};
