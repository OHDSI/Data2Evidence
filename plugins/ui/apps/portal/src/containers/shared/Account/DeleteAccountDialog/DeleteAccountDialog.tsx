import React, { FC, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { config } from "../../../../config";
import { useFeedback, useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./DeleteAccountDialog.scss";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const DeleteAccountDialog: FC<DeleteAccountDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const { getText } = useTranslation();
  const { setFeedback, setGenericErrorFeedback } = useFeedback();

  const handleDeleteUser = useCallback(async () => {
    try {
      setDeleting(true);
      await api.userMgmt.deleteMyUser();

      onClose();
      navigate(config.ROUTES.logout);
    } catch (err: any) {
      if (err.data?.message) {
        setFeedback({ type: "error", message: err.data.message });
      } else {
        setGenericErrorFeedback();
      }
      onClose();
    } finally {
      setDeleting(false);
    }
  }, [onClose, setFeedback, setGenericErrorFeedback, navigate]);

  return (
    <Dialog
      className="delete-account-dialog"
      title={getText(i18nKeys.DELETE_ACCOUNT_DIALOG__TITLE)}
      closable
      open={open}
      onClose={onClose}
      data-testid="delete-account-dialog"
    >
      <div className="delete-account-dialog__content">
        {getText(i18nKeys.DELETE_ACCOUNT_DIALOG__CONFIRM)}
        <br />
        {getText(i18nKeys.DELETE_ACCOUNT_DIALOG__WARNING)}
      </div>
      <div className="button-group-actions">
        <Button text={getText(i18nKeys.DELETE_ACCOUNT_DIALOG__CANCEL)} onClick={onClose} variant="outlined" block disabled={deleting} />
        <Button text={getText(i18nKeys.DELETE_ACCOUNT_DIALOG__DELETE)} onClick={handleDeleteUser} block loading={deleting} data-testid="button-delete" />
      </div>
    </Dialog>
  );
};

export default DeleteAccountDialog;
