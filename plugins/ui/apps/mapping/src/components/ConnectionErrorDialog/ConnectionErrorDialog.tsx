import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { ErrorOutline } from "@mui/icons-material";

interface ConnectionErrorDialogProps {
  open: boolean;
  onClose: () => void;
  errorMessage: string;
}

export const ConnectionErrorDialog: React.FC<ConnectionErrorDialogProps> = ({ open, onClose, errorMessage }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="connection-error-dialog">
      <DialogTitle className="connection-error-dialog__title">
        <ErrorOutline style={{ color: "red", marginRight: "0.5em" }} />
        Connection Error
      </DialogTitle>
      <DialogContent className="connection-error-dialog__content">
        <Typography variant="body1">Could not connect to DB server:</Typography>
        <Typography variant="body2" style={{ marginTop: "1em" }}>
          {errorMessage}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
