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
import { useTranslation } from "../../../contexts";
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
  const { getText, i18nKeys } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="overwrite-dialog">
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_TITLE)}
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
          {getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_DESCRIPTION)}
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <Typography component="li" variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_DELETE_FLOWS)}</strong>
          </Typography>
          <Typography component="li" variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_DELETE_HISTORY)}</strong>
          </Typography>
          <Typography component="li" variant="body2">
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_IMPORT_FLOWS)}
          </Typography>
          <Typography component="li" variant="body2">
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_CREATE_NEW)}
          </Typography>
        </Box>

        <Alert severity="error">
          <Typography variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_WARNING_TITLE)}</strong>{" "}
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_WARNING_MESSAGE)}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions className="overwrite-dialog__actions">
        <Button onClick={onConfirm} variant="contained" color="primary" disabled={loading} sx={{ minWidth: 120 }}>
          {loading
            ? getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_PROCESSING)
            : getText(i18nKeys.GIT_CONFIG__OVERWRITE_DIALOG_CONFIRM)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
