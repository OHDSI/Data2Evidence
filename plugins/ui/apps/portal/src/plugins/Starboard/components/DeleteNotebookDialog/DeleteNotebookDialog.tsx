import React, { FC, useCallback } from "react";
import { Button, Dialog } from "@portal/components";
import { StarboardNotebook } from "../../utils/notebook";
import { Divider } from "@mui/material";
import "./DeleteNotebookDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteNotebookDialogProps {
  notebook?: StarboardNotebook;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteNotebookDialog: FC<DeleteNotebookDialogProps> = ({ notebook, open, onClose, onDelete }) => {
  const { getText, i18nKeys } = useTranslation();
  const handleDelete = useCallback(() => {
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  return (
    <Dialog
      className="delete-notebook-dialog"
      title={getText(i18nKeys.DELETE_NOTEBOOK_DIALOG__DELETE_NOTEBOOK)}
      closable
      open={open}
      onClose={onClose}
    >
      <Divider />
      <div className="delete-notebook-dialog__content">
        <div>{getText(i18nKeys.DELETE_NOTEBOOK_DIALOG__CONFIRM)}:</div>
        <div>
          {notebook?.name ? <strong>&quot;{notebook.name}&quot;</strong> : <strong>&quot;Untitled&quot;</strong>}?
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button text={getText(i18nKeys.DELETE_NOTEBOOK_DIALOG__CANCEL)} onClick={onClose} variant="outlined" block />
        <Button text={getText(i18nKeys.DELETE_NOTEBOOK_DIALOG__DELETE)} onClick={handleDelete} block />
      </div>
    </Dialog>
  );
};

export default DeleteNotebookDialog;
