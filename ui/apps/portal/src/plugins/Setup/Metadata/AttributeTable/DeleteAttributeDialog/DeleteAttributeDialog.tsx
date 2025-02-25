import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog } from "@portal/components";
import { api } from "../../../../../axios/api";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { CloseDialogType } from "../../../../../types";
import { DatasetAttributeConfig } from "../../../../../types";
import "./DeleteAttributeDialog.scss";

interface DeleteAttributeDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  attribute: DatasetAttributeConfig;
  setRefetch: React.Dispatch<React.SetStateAction<number>>;
}

export const DeleteAttributeDialog: FC<DeleteAttributeDialogProps> = ({ open, onClose, attribute, setRefetch }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [deleting, setDeleting] = useState(false);

  const attributeId = attribute.id;

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleDelete = useCallback(async () => {
    try {
      setDeleting(true);
      await api.systemPortal.deleteDatasetAttributeConfig(attributeId);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__SUCCESS),
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
  }, [handleClose, attributeId, setRefetch, setFeedback, getText]);

  return (
    <Dialog
      className="delete-attribute-dialog"
      title={getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__DELETE_ATTRIBUTE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <div className="delete-attribute-dialog__content">
        <div className="delete-attribute-dialog__content-text">
          <div>
            {getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__CONFIRMATION)} <br />
            {getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__ATTRIBUTES)}: <strong>&quot;{attributeId}&quot;</strong>? <br />
          </div>
        </div>
      </div>
      <div className="delete-attribute-dialog__footer">
        <Box display="flex" gap={1} className="delete-attribute-dialog__footer-actions">
          <Button
            text={getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__CANCEL)}
            variant="outlined"
            onClick={() => handleClose("cancelled")}
          />
          <Button text={getText(i18nKeys.DELETE_ATTRIBUTE_DIALOG__DELETE)} onClick={handleDelete} loading={deleting} />
        </Box>
      </div>
    </Dialog>
  );
};
