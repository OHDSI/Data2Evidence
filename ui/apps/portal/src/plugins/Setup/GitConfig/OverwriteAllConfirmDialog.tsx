import { Close, Warning } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import React, { FC } from "react";
import "./OverwriteAllConfirmDialog.scss";

interface OverwriteAllConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const OverwriteAllConfirmDialog: FC<OverwriteAllConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="overwrite-dialog">
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Overwrite All Local Flows
          </Box>
          <IconButton
            onClick={onClose}
            disabled={loading}
            sx={{
              color: (theme) => theme.palette.grey[500],
              "&:hover": {
                backgroundColor: (theme) => theme.palette.grey[100],
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" paragraph>
          This operation will:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <Typography component="li" variant="body2">
            <strong>Delete all existing local data transformation flows</strong>
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Delete all local flow revisions and history</strong>
          </Typography>
          <Typography component="li" variant="body2">
            Import all flows from the remote Git repository
          </Typography>
          <Typography component="li" variant="body2">
            Create new local flows with version 1
          </Typography>
        </Box>

        <Alert severity="error">
          <Typography variant="body2">
            <strong>Warning:</strong> All local changes not synchronized to the remote repository will be permanently
            lost.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions className="overwrite-dialog__actions">
        <Button onClick={onConfirm} variant="contained" color="primary" disabled={loading} sx={{ minWidth: 120 }}>
          {loading ? "Processing..." : "Overwrite All"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
