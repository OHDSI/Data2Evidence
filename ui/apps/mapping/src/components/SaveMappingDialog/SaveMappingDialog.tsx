import { FC, useCallback, useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog, FormControl, TextField } from "@portal/components";
import { useApp } from "../../contexts";
import { saveBlobAs } from "../../utils/utils";
import "./SaveMappingDialog.scss";

export type CloseDialogType = "success" | "cancelled";
interface SaveMappingDialogProps {
  open: boolean;
  nextAction?: string;
  onClose?: (type: CloseDialogType, nextAction?: string) => void;
}

export const SaveMappingDialog: FC<SaveMappingDialogProps> = ({ open, nextAction, onClose }) => {
  const [fileName, setFileName] = useState("");
  const { markAsSaved, state } = useApp();
  const [ask, setAsk] = useState(false);
  const hasNextAction = Boolean(nextAction);

  useEffect(() => {
    if (open) setFileName("scan-report.json");
  }, [open]);

  useEffect(() => {
    setAsk(hasNextAction);
  }, [hasNextAction]);

  const handleConfirm = useCallback(() => {
    setAsk(false);
  }, []);

  const handleSave = useCallback(() => {
    const jsonData = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    saveBlobAs(blob, fileName);
    markAsSaved();

    typeof onClose === "function" && onClose("success", nextAction);
  }, [markAsSaved, fileName, state, onClose, nextAction]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type, nextAction);
    },
    [onClose, nextAction]
  );

  return (
    <Dialog
      className="save-mapping-dialog"
      title="Save Mapping"
      open={open}
      onClose={() => handleClose("cancelled")}
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            maxWidth: "740px",
          },
        },
      }}
    >
      <Divider />
      <div className="save-mapping-dialog__content">
        {ask ? (
          <div>Save current mapping?</div>
        ) : (
          <FormControl fullWidth>
            <TextField
              fullWidth
              variant="standard"
              value={fileName}
              label="Name"
              onChange={(event) => setFileName(event.target.value || "")}
            />
          </FormControl>
        )}
      </div>
      <Divider />
      <div className="button-group-actions">
        {hasNextAction && ask && (
          <Button block text="Continue without save" onClick={() => handleClose("success")} variant="outlined" />
        )}
        <Button block text="Cancel" onClick={() => handleClose("cancelled")} variant="outlined" />
        <Button block text="Save" onClick={ask ? handleConfirm : handleSave} variant="contained" disabled={!fileName} />
      </div>
    </Dialog>
  );
};
