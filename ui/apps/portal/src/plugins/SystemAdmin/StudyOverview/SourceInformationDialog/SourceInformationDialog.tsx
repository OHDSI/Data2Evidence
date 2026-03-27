import React, { FC, useCallback } from "react";
import { CloseDialogType, Study } from "../../../../types";
import { Dialog, Button } from "@portal/components";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import "./SourceInformationDialog.scss";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface SourceInformationDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SourceInformationDialog: FC<SourceInformationDialogProps> = ({ dataset, open, onClose }) => {
  const { getText } = useTranslation();

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="source-information-dialog"
      title={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      maxWidth="md"
    >
      <Divider />
      <div className="source-information-dialog__content">
        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATASET_NAME)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField disabled fullWidth variant="standard" value={dataset?.studyDetail?.name} />
        </div>

        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATABASE_CODE)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField disabled fullWidth variant="standard" value={dataset?.databaseCode} />
        </div>
      </div>

      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.UPDATE_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
      </div>
    </Dialog>
  );
};

export default SourceInformationDialog;
