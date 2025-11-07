import { Close, Warning } from "@mui/icons-material";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { FC } from "react";
import { useTranslation } from "../../../contexts";
import "./OverwriteAllConfirmDialog.scss";

interface OverwriteAllNotebooksDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const OverwriteAllNotebooksDialog: FC<OverwriteAllNotebooksDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading,
}) => {
  const { getText, i18nKeys } = useTranslation();

  const headerBoxStyle = { display: "flex", alignItems: "center", justifyContent: "space-between" };
  const titleBoxStyle = { display: "flex", alignItems: "center", gap: 1 };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="overwrite-dialog">
      <DialogTitle>
        <div style={headerBoxStyle}>
          <div style={titleBoxStyle}>
            <Warning color="warning" />
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_TITLE)}
          </div>
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
        </div>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" paragraph>
          {getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_DESCRIPTION)}
        </Typography>
        <ul style={{ paddingLeft: "16px", marginBottom: "16px" }}>
          <Typography component="li" variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_DELETE_NOTEBOOKS)}</strong>
          </Typography>
          <Typography component="li" variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_DELETE_CONTENT)}</strong>
          </Typography>
          <Typography component="li" variant="body2">
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_IMPORT_NOTEBOOKS)}
          </Typography>
          <Typography component="li" variant="body2">
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_CREATE_NEW)}
          </Typography>
        </ul>

        <Alert severity="error">
          <Typography variant="body2">
            <strong>{getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_WARNING_TITLE)}</strong>{" "}
            {getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_WARNING_MESSAGE)}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions className="overwrite-dialog__actions">
        <Button onClick={onConfirm} variant="contained" color="primary" disabled={loading} sx={{ minWidth: 120 }}>
          {loading
            ? getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_PROCESSING)
            : getText(i18nKeys.GIT_CONFIG__OVERWRITE_NOTEBOOKS_DIALOG_CONFIRM)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
