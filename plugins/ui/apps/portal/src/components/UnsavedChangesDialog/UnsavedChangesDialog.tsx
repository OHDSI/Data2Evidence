import React, { FC } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Brand navy from the Figma design (Primary/Default). Hard-coded rather than the
// MUI theme primary so the dialog matches the design regardless of active theme.
const NAVY = "#000080";

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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          maxWidth: "540px",
          boxShadow:
            "0px 6px 30px 5px rgba(0,0,0,0.12), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 8px 10px -5px rgba(0,0,0,0.2)",
        },
      }}
      aria-labelledby="unsaved-changes-dialog-title"
      aria-describedby="unsaved-changes-dialog-description"
      data-testid="unsaved-changes-dialog"
    >
      <DialogTitle
        id="unsaved-changes-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          pt: 3,
          pb: 1.5,
        }}
      >
        <Typography
          variant="h5"
          component="span"
          sx={{ fontWeight: 500, fontSize: "18px", lineHeight: 1.2, letterSpacing: 0, color: NAVY }}
        >
          You have unsaved changes
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onCancel}
          size="small"
          data-testid="unsaved-changes-close"
          sx={{ color: NAVY }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 2, pb: 3 }}>
        <Typography
          id="unsaved-changes-dialog-description"
          variant="body1"
          sx={{ color: "#000000", fontSize: "16px", lineHeight: 1.5 }}
        >
          If you navigate away now, any unsaved changes will be lost. This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          gap: 2,
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "#dedcda",
        }}
      >
        <Button
          variant="outlined"
          fullWidth
          onClick={onLeave}
          data-testid="unsaved-changes-leave"
          sx={{
            height: "40px",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            color: NAVY,
            borderColor: "#cccfe5",
            "&:hover": { borderColor: "#cccfe5", backgroundColor: "rgba(0,0,128,0.04)" },
          }}
        >
          Leave without saving
        </Button>
        <Button
          variant="contained"
          fullWidth
          autoFocus
          onClick={onCancel}
          data-testid="unsaved-changes-cancel"
          sx={{
            height: "40px",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            color: "#faf8f8",
            backgroundColor: NAVY,
            boxShadow:
              "0px 1px 5px 0px rgba(0,0,0,0.12), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
            "&:hover": { backgroundColor: "#000066" },
          }}
        >
          Stay on page
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
