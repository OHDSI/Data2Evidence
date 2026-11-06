import { FC, useEffect, useMemo, useState } from "react";
import { Dialog, Button, Select, TextField, Alert } from "ui-react";
import { DatasetAttributeConfig } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import "./ManageMetadataDialog.scss";

export type MetadataEntryMode = "add" | "update";

interface MetadataEntryDialogProps {
  open: boolean;
  mode: MetadataEntryMode;
  attributeConfigs: DatasetAttributeConfig[];
  usedAttributeIds: string[];
  initial?: { attributeId: string; value: string };
  busy?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (attributeId: string, value: string) => void;
}

const MetadataEntryDialog: FC<MetadataEntryDialogProps> = ({
  open,
  mode,
  attributeConfigs,
  usedAttributeIds,
  initial,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [attributeId, setAttributeId] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setAttributeId(initial?.attributeId ?? "");
      setValue(initial?.value ?? "");
    }
  }, [open, initial]);

  const items = useMemo(() => {
    const used = new Set(usedAttributeIds.filter((id) => id !== initial?.attributeId));
    return attributeConfigs
      .filter((cfg) => !used.has(cfg.id))
      .map((cfg) => ({ label: cfg.name, value: cfg.id }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [attributeConfigs, usedAttributeIds, initial]);

  const requiredFilled = !!attributeId && !!value.trim();
  const isDirty =
    mode === "add" ||
    attributeId !== (initial?.attributeId ?? "") ||
    value.trim() !== (initial?.value ?? "").trim();
  const canSubmit = requiredFilled && isDirty;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(attributeId, value.trim());
  };

  return (
    <Dialog
      title={
        mode === "add"
          ? getText(i18nKeys.MANAGE_METADATA_DIALOG__ADD_TITLE)
          : getText(i18nKeys.MANAGE_METADATA_DIALOG__UPDATE_TITLE)
      }
      size="s"
      open={open}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__CANCEL)}
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={busy} disabled={!canSubmit || busy}>
            {mode === "add"
              ? getText(i18nKeys.MANAGE_METADATA_DIALOG__ADD)
              : getText(i18nKeys.MANAGE_METADATA_DIALOG__UPDATE)}
          </Button>
        </>
      }
    >
      <div className="manage-metadata__form">
        {errorMessage && (
          <Alert severity="error" variant="banner">
            {errorMessage}
          </Alert>
        )}
        <Select
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_NAME)}
          value={attributeId}
          items={items}
          searchable
          required
          onChange={(v) => setAttributeId((v as string) ?? "")}
        />
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_ID)}
          value={attributeId}
          required
          disabled
        />
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_VALUE)}
          value={value}
          onChange={setValue}
          required
        />
      </div>
    </Dialog>
  );
};

export default MetadataEntryDialog;
