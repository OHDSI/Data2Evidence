import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Divider from "@mui/material/Divider";
import { SxProps } from "@mui/material";
import { Autocomplete, Button, Chip, Dialog, TextArea, TextField } from "@portal/components";
import isEqual from "lodash/isEqual";
import pick from "lodash/pick";
import { CloseDialogType, DB_DIALECTS, Feedback, IDatabase, IDbPublication } from "../../../../types";
import { api } from "../../../../axios/api";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { useTranslation } from "../../../../contexts";
import { PUB_SLOT_NAME } from "../../../../constant";
import { BigQueryForm } from "../SaveDbDialog/BigQueryForm";
import "./EditDbDetailsDialog.scss";

interface EditDbDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  db: IDatabase;
}

interface FormData {
  name: string;
  host: string;
  port: number;
  vocabSchemas: string[];
  extra: string;
  publication: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  host: "",
  port: 5432,
  vocabSchemas: [],
  extra: "",
  publication: "",
};

const styles: SxProps = {
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    color: "var(--color-neutral)",
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
};

const mapExtraToHashmap = (extraArr: any[]): { [key: string]: any } => {
  const extra: any = {};
  extraArr.forEach((e) => {
    extra[e.serviceScope] = e.value;
  });
  return extra;
};

export const EditDbDetailsDialog: FC<EditDbDialogProps> = ({ open, onClose, db }) => {
  const { getText } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [originalExtra, setOriginalExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const publication = db.publications?.length > 0 ? db.publications[0].publication : "";
  const dialect = db.dialect;

  const hasChanges = useMemo(
    () =>
      !isEqual(db.name, formData.name) ||
      !isEqual(db.host, formData.host) ||
      !isEqual(db.port, formData.port) ||
      (!isEqual(db.vocabSchemas, formData.vocabSchemas) && formData.vocabSchemas.length > 0) ||
      originalExtra !== formData.extra ||
      !isEqual(publication, formData.publication),
    [db, formData, originalExtra]
  );

  useEffect(() => {
    if (open) {
      const extraStr = JSON.stringify(mapExtraToHashmap(db.extra), null, 4);
      setFormData({
        name: db.name,
        host: db.host,
        port: db.port,
        vocabSchemas: db.vocabSchemas,
        extra: extraStr,
        publication: publication,
      });
      setOriginalExtra(extraStr);
      setFeedback({});
      setLoading(false);
    }
  }, [open]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleUpdate = useCallback(async () => {
    try {
      setLoading(true);

      const publications: IDbPublication[] = [];
      if (dialect === DB_DIALECTS.POSTGRES && formData.publication) {
        publications.push({ publication: formData.publication, slot: PUB_SLOT_NAME });
      }

      await api.dbCredentialsMgr.updateDbDetails({
        id: db.id,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        vocabSchemas: formData.vocabSchemas,
        extra: formData.extra ? JSON.parse(formData.extra) : {},
        publications,
      });
      setFeedback({
        type: "success",
        message: `Database ${db.code} details updated`,
      });
      handleClose("success");
    } catch (err: any) {
      const message = err?.data?.message || err?.data?.error_description;
      if (message) {
        setFeedback({ type: "error", message });
      } else {
        console.log("There is an error in updating details", err);
        setFeedback({
          type: "error",
          message: "An error has occurred.",
          description: "Please try again. To report the error, please send an email to help@data4life.care.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [formData, dialect]);

  return (
    <Dialog
      className="edit-db-dialog"
      title="Edit database details"
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="edit-db-dialog__content">
        <div style={{ marginBottom: "32px" }}>
          <label className="database-code__label">{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__DATABASE_ID)}</label>
          <label className="database-code-value__label">{db.code}</label>
        </div>
        {db.dialect === DB_DIALECTS.BIG_QUERY ? (
          <>
            <BigQueryForm
              data={pick(formData, "host", "name", "extra")}
              onChange={(changes) => handleFormDataChange(changes)}
              renderExtra
              extraLabel={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__EXTRA)}
            />
          </>
        ) : (
          <>
            <div style={{ marginBottom: "32px" }}>
              <div style={{ marginBottom: "16px" }}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__DATABASE_NAME)}</b>
              </div>
              <div style={{ marginBottom: "32px" }}>
                <TextField
                  fullWidth
                  variant="standard"
                  value={formData.name}
                  onChange={(event) => handleFormDataChange({ name: event.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px", display: "flex", gap: "32px" }}>
                <div style={{ width: "100%" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__HOST)}</b>
                  </div>
                  <div style={{ marginBottom: "32px" }}>
                    <TextField
                      fullWidth
                      variant="standard"
                      value={formData.host}
                      onChange={(event) => handleFormDataChange({ host: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PORT)}</b>
                  </div>
                  <div style={{ marginBottom: "32px" }}>
                    <TextField
                      variant="standard"
                      type="number"
                      sx={{ width: "150px" }}
                      value={formData.port}
                      onChange={(event) => handleFormDataChange({ port: Number(event.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__VOCAB_SCHEMA)}</b>
              </div>
              <div style={{ marginBottom: "32px" }}>
                <Autocomplete
                  multiple
                  freeSolo
                  autoSelect
                  options={[] as string[]}
                  sx={styles}
                  id="autocomplete-vocab-schemas"
                  renderTags={(value: string[], getTagProps) =>
                    value.map((option: string, index: number) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} variant="standard" helperText="Press enter to confirm the entry" />
                  )}
                  value={formData.vocabSchemas}
                  onChange={(event, vocabSchemas) => handleFormDataChange({ vocabSchemas })}
                />
              </div>
            </div>
            <div style={{ marginBottom: "32px" }}>
              <div style={{ marginBottom: "16px" }}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__EXTRA)}</b>
              </div>
              <div>
                <TextArea
                  rows={10}
                  value={formData.extra}
                  onChange={(event) => handleFormDataChange({ extra: event.target.value })}
                />
              </div>
            </div>
            <div style={{ marginBottom: "32px" }} hidden={dialect !== DB_DIALECTS.POSTGRES}>
              <div style={{ marginBottom: "16px" }}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CACHE_REPLICATION)}</b>
              </div>
              <div style={{ marginBottom: "8px", display: "flex", gap: "32px" }}>
                <TextField
                  label={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PUBLICATION)}
                  variant="standard"
                  sx={{ minWidth: "300px" }}
                  value={formData.publication}
                  onChange={(event) => handleFormDataChange({ publication: event.target?.value })}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <Divider />

      <div className="edit-db-dialog__footer">
        <div style={{ display: "flex", gap: "8px" }} className="edit-db-dialog__footer-actions">
          <Button
            text={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CANCEL)}
            variant="outlined"
            onClick={() => handleClose("cancelled")}
            disabled={loading}
          />
          <Button
            text={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__UPDATE)}
            onClick={handleUpdate}
            loading={loading}
            disabled={!hasChanges}
          />
        </div>
      </div>
    </Dialog>
  );
};
