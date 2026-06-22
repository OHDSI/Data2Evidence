import React, { FC } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export interface UnsavedChangesDialogProps {
  open: boolean;
  onLeave: () => void;
  onCancel: () => void;
}

export const UnsavedChangesDialog: FC<UnsavedChangesDialogProps> = ({ open, onLeave, onCancel }) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="unsaved-changes-dialog-title"
      aria-describedby="unsaved-changes-dialog-description"
      data-testid="unsaved-changes-dialog"
    >
      <DialogTitle id="unsaved-changes-dialog-title">Unsaved Changes</DialogTitle>
      <DialogContent>
        <DialogContentText id="unsaved-changes-dialog-description">
          You have unsaved changes. Are you sure you want to leave this page? Changes will be lost.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} data-testid="unsaved-changes-cancel">
          Cancel
        </Button>
        <Button onClick={onLeave} color="primary" data-testid="unsaved-changes-leave">
          Leave
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
