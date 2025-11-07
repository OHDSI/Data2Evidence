import React, { FC, useCallback, useState } from "react";
import { Button, Dialog } from "@portal/components";
import TextField from "@mui/material/TextField";
import { CloseDialogType } from "../../../../types";
import { StarboardNotebook } from "../../utils/notebook";
import "./EditTitleDialog.scss";
import { Divider } from "@mui/material";
import { useTranslation } from "../../../../contexts";

interface EditTitleDialogProps {
  title?: string;
  open: boolean;
  onClose: (type: CloseDialogType) => void;
  renameNotebook: (name: string) => Promise<void>;
  notebooks: StarboardNotebook[] | undefined;
}

export const EditTitleDialog: FC<EditTitleDialogProps> = ({ title, open, onClose, renameNotebook, notebooks }) => {
  const { getText, i18nKeys } = useTranslation();
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [notebookTitle, setNotebookTitle] = useState(title);

  const handleNotebookChanges = (e: any) => {
    setNotebookTitle(e.target.value);
  };

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleRename = useCallback(async () => {
    try {
      if (notebookTitle) {
        if (notebooks?.some((nb) => nb.name.toUpperCase() === notebookTitle.toUpperCase())) {
          setShowErrorMessage(true);
          return;
        }
        await renameNotebook(notebookTitle);
      }
      handleClose("success");
    } catch (err: any) {
      console.log(err);
      setShowErrorMessage(true);
    }
  }, [notebookTitle, renameNotebook, handleClose, notebooks]);

  return (
    <Dialog
      className="edit-title-dialog"
      closable
      title={getText(i18nKeys.EDIT_TITLE_DIALOG__EDIT_NOTEBOOK_TITLE)}
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <div className="edit-title-dialog__content">
        <TextField
          id="standard-helperText"
          label={getText(i18nKeys.EDIT_TITLE_DIALOG__NOTEBOOK_TITLE)}
          defaultValue={notebookTitle}
          variant="standard"
          onChange={handleNotebookChanges}
        />
        {showErrorMessage && (
          <div className="edit-title-dialog__content__error">{getText(i18nKeys.EDIT_TITLE_DIALOG__ALREADY_EXISTS)}</div>
        )}
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.EDIT_TITLE_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button text={getText(i18nKeys.EDIT_TITLE_DIALOG__SAVE)} onClick={handleRename} block />
      </div>
    </Dialog>
  );
};
