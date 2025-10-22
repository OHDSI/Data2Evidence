import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog, Select, MenuItem, SelectChangeEvent } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Study, CloseDialogType } from "../../../../types";
import "./ManageDashboardDialog.scss";

interface ManageDashboardDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

const ManageDashboardDialog: FC<ManageDashboardDialogProps> = ({ study, open, onClose }) => {
  loader.config({ monaco });

  const [dashboardCode, setDashboardCode] = useState<string>("hello123");

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="manage-dashboard-dialog"
      title={"Manage Dashboard"}
      closable
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />

      <div className="manage-dashboard-dialog__header">
        <div>
          <Select value="hello">
            <MenuItem value="hello">Hello</MenuItem>
            <MenuItem value="hello1">Hello 1</MenuItem>
          </Select>
        </div>
        <div>
          <Button text="Start Viewer" variant="text" />
          <Button text="Stop Viewer" variant="text" />
        </div>
      </div>
      <Divider />

      <div className="manage-dashboard-dialog__content">
        <SafeEditor
          height="70vh"
          language="r"
          value={dashboardCode}
          options={{
            scrollBeyondLastLine: false,
            fontSize: "14px",
          }}
          onChange={setDashboardCode}
        />
      </div>
      <Divider />

      <div className="button-group-actions">
        <Button text="Cancel" onClick={() => handleClose("cancelled")} variant="outlined" block />
        <Button text="Save" block />
      </div>
    </Dialog>
  );
};

export default ManageDashboardDialog;
