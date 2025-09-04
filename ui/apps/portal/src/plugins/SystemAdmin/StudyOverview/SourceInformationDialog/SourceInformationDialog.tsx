import React, { FC, useCallback } from "react";
import { CloseDialogType, Study } from "../../../../types";
import { Dialog, Button, Box } from "@portal/components";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import { SxProps } from "@mui/system";
import "./SourceInformationDialog.scss";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface SourceInformationDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const styles: SxProps = {
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    color: "var(--color-neutral)",
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
};

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
      title="Source Information"
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      maxWidth="md"
    >
      <Divider />
      <div className="source-information-dialog__content">
        <Box mt={4} fontWeight="bold">
          Dataset Name
        </Box>
        <Box mb={4}>
          <TextField disabled fullWidth variant="standard" value={dataset?.studyDetail?.name} />
        </Box>

        <Box mt={4} fontWeight="bold">
          Database Code
        </Box>
        <Box mb={4}>
          <TextField disabled fullWidth variant="standard" value={dataset?.databaseCode} />
        </Box>
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
