import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog } from "@portal/components";
import { api } from "../../../../../axios/api";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { CloseDialogType } from "../../../../../types";
import "./DeleteTagDialog.scss";

interface DeleteTagDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  name: string;
  setRefetch: React.Dispatch<React.SetStateAction<number>>;
}

export const DeleteTagDialog: FC<DeleteTagDialogProps> = ({ open, onClose, name, setRefetch }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [deleting, setDeleting] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleDelete = useCallback(async () => {
    try {
      setDeleting(true);
      await api.systemPortal.deleteDatasetTagConfig(name);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.DELETE_TAG_DIALOG__SUCCESS),
        autoClose: 6000,
      });
      setRefetch((refetch) => refetch + 1);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data.error,
        description: err.data.message,
        autoClose: 6000,
      });
    } finally {
      setDeleting(false);
    }
  }, [handleClose, name, setRefetch, setFeedback, getText]);

  return (
    <Dialog
      className="delete-tag-dialog"
      title={getText(i18nKeys.DELETE_TAG_DIALOG__DELETE_TAG)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <>
        <div className="delete-tag-dialog__content">
          <div className="delete-tag-dialog__content-text">
            <div>
              {getText(i18nKeys.DELETE_TAG_DIALOG__CONFIRM_1)} <br />
              {getText(i18nKeys.DELETE_TAG_DIALOG__CONFIRM_2)}: <strong>&quot;{name}&quot;</strong>? <br />
            </div>
          </div>
        </div>
        <div className="delete-tag-dialog__footer">
          <Box display="flex" gap={1} className="delete-tag-dialog__footer-actions">
            <Button
              text={getText(i18nKeys.DELETE_TAG_DIALOG__CANCEL)}
              variant="outlined"
              onClick={() => handleClose("cancelled")}
            />
            <Button text={getText(i18nKeys.DELETE_TAG_DIALOG__DELETE)} onClick={handleDelete} loading={deleting} />
          </Box>
        </div>
      </>
    </Dialog>
  );
};
