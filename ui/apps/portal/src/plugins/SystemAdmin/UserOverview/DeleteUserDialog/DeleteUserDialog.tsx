import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog, Feedback } from "@portal/components";
import { CloseDialogType, UserWithRolesInfoExt } from "../../../../types";
import { api } from "../../../../axios/api";
import "./DeleteUserDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteUserDialogProps {
  user?: UserWithRolesInfoExt;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const DeleteUserDialog: FC<DeleteUserDialogProps> = ({ user, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const userId = user?.userId;

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleDelete = useCallback(async () => {
    if (userId == null) return;

    try {
      setLoading(true);
      await api.userMgmt.deleteUser(userId);
      handleClose("success");
    } catch (err: any) {
      console.error("err", err);
      if (err?.data?.message) {
        setFeedback({ type: "error", message: err?.data?.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.DELETE_USER_DIALOG__ERROR),
          description: getText(i18nKeys.DELETE_USER_DIALOG__DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, handleClose, getText]);

  return (
    <Dialog
      className="delete-user-dialog"
      title={getText(i18nKeys.DELETE_USER_DIALOG__DELETE_USER)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-user-dialog__content">
        <div>{getText(i18nKeys.DELETE_USER_DIALOG__CONFIRM)}:</div>
        <div>{user?.username} ?</div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.DELETE_USER_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button text={getText(i18nKeys.DELETE_USER_DIALOG__YES)} onClick={handleDelete} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default DeleteUserDialog;
