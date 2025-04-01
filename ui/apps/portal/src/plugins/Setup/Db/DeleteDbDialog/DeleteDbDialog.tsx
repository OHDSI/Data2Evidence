import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useFeedback, useTranslation } from "../../../../contexts";
import { CloseDialogType, IDatabase } from "../../../../types";
import "./DeleteDbDialog.scss";

interface DeleteDbDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  db: IDatabase;
}

export const DeleteDbDialog: FC<DeleteDbDialogProps> = ({ open, onClose, db }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [deleting, setDeletingn] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleDelete = useCallback(async () => {
    try {
      setDeletingn(true);
      await api.dbCredentialsMgr.deleteDb(db.id);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.DELETE_DB_DIALOG__DELETE_SUCCESS),
        autoClose: 6000,
      });
      handleClose("success");
    } finally {
      setDeletingn(false);
    }
  }, [handleClose, db.id, setFeedback, getText]);

  return (
    <Dialog
      className="delete-db-dialog"
      title={getText(i18nKeys.DELETE_DB_DIALOG__DELETE_DATABASE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <div className="delete-db-dialog__content">
        <div className="delete-db-dialog__content-text">
          {getText(i18nKeys.DELETE_DB_DIALOG__CONFIRMATION)} <br />
          {getText(i18nKeys.DELETE_DB_DIALOG___DATABASE)}: <strong>&quot;{db.code}&quot;</strong>? <br />
        </div>
      </div>
      <div className="delete-db-dialog__footer">
        <Box display="flex" gap={1} className="delete-db-dialog__footer-actions">
          <Button
            text={getText(i18nKeys.DELETE_DB_DIALOG__CANCEL)}
            variant="outlined"
            onClick={() => handleClose("cancelled")}
          />
          <Button text={getText(i18nKeys.DELETE_DB_DIALOG__DELETE)} onClick={handleDelete} loading={deleting} />
        </Box>
      </div>
    </Dialog>
  );
};
