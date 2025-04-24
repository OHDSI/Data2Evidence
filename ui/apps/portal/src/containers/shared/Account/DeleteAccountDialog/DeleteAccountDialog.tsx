import React, { FC, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { config } from "../../../../config";
import { useFeedback } from "../../../../contexts";
import "./DeleteAccountDialog.scss";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const DeleteAccountDialog: FC<DeleteAccountDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
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
      title="Delete account"
      closable
      open={open}
      onClose={onClose}
      data-testid="delete-account-dialog"
    >
      <div className="delete-account-dialog__content">
        Are you sure you want to delete your account?
        <br />
        You can&apos;t undo this action
      </div>
      <div className="button-group-actions">
        <Button text="Cancel" onClick={onClose} variant="outlined" block disabled={deleting} />
        <Button text="Yes, delete" onClick={handleDeleteUser} block loading={deleting} data-testid="button-delete" />
      </div>
    </Dialog>
  );
};

export default DeleteAccountDialog;
