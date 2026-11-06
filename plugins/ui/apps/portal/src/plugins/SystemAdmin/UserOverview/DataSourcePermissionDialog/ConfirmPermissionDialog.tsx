import React, { FC, ReactNode, useState } from "react";
import { Button, Dialog } from "ui-react";
import { useTranslation } from "../../../../contexts";

interface ConfirmPermissionDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  children: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export const ConfirmPermissionDialog: FC<ConfirmPermissionDialogProps> = ({
  open,
  title,
  confirmLabel,
  danger,
  children,
  onConfirm,
  onClose,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      size="s"
      title={title}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {getText(i18nKeys.DATA_SOURCE_PERMISSION__CANCEL)}
          </Button>
          <Button
            variant="primary"
            className={danger ? "d2e-dsp__danger-confirm" : undefined}
            loading={busy}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
};
