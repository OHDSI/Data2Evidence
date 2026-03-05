import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { SxProps } from "@mui/material";
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextArea,
  TextField,
} from "@portal/components";
import isEqual from "lodash/isEqual";
import pick from "lodash/pick";
import { CloseDialogType, DB_DIALECTS, Feedback, IDatabase, IDbPublication, SSL_MODES } from "../../../../types";
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
  sslmode: string;
  ca: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  host: "",
  port: 5432,
  vocabSchemas: [],
  extra: "",
  publication: "",
  sslmode: "",
  ca: "",
};

interface FormError {
  name: boolean;
  host: boolean;
  port: boolean;
  ca: boolean;
}

const EMPTY_FORM_ERROR: FormError = {
  name: false,
  host: false,
  port: false,
  ca: false,
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
  const [originalSslmode, setOriginalSslmode] = useState("");
  const [originalCa, setOriginalCa] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const publication = db.publications?.length > 0 ? db.publications[0].publication : "";
  const dialect = db.dialect;

  const hasChanges = useMemo(
    () =>
      !isEqual(db.name, formData.name) ||
      !isEqual(db.host, formData.host) ||
      !isEqual(db.port, formData.port) ||
      (!isEqual(db.vocabSchemas, formData.vocabSchemas) && formData.vocabSchemas.length > 0) ||
      originalExtra !== formData.extra ||
      originalSslmode !== formData.sslmode ||
      originalCa !== formData.ca ||
      !isEqual(publication, formData.publication),
    [db, formData, originalExtra, originalSslmode, originalCa]
  );

  useEffect(() => {
    if (open) {
      const extraHashmap = mapExtraToHashmap(db.extra);

      // Parse Internal extra into an object and extract TLS settings
      let sslmode = "";
      let ca = "";
      let internalObj: Record<string, any> = {};
      if (extraHashmap.Internal) {
        try {
          internalObj =
            typeof extraHashmap.Internal === "string" ? JSON.parse(extraHashmap.Internal) : extraHashmap.Internal;
          sslmode = internalObj.sslmode || "";
          ca = internalObj.ca || "";
          // Remove TLS fields so they don't appear in the Extra textarea
          delete internalObj.sslmode;
          delete internalObj.ca;
        } catch {
          // If parsing fails, leave extra as empty object
        }
      }

      // Display Internal contents directly (without the "Internal" wrapper)
      const extraStr = JSON.stringify(internalObj, null, 4);
      setFormData({
        name: db.name,
        host: db.host,
        port: db.port,
        vocabSchemas: db.vocabSchemas,
        extra: extraStr,
        publication: publication,
        sslmode,
        ca,
      });
      setOriginalExtra(extraStr);
      setOriginalSslmode(sslmode);
      setOriginalCa(ca);
      setFeedback({});
      setFormError(EMPTY_FORM_ERROR);
      setLoading(false);
    }
  }, [open]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const isFormError = useCallback(() => {
    const errors: FormError = {
      name: !formData.name.trim(),
      host: !formData.host.trim(),
      port: !formData.port,
      ca: (formData.sslmode === "verify-ca" || formData.sslmode === "verify-full") && !formData.ca,
    };
    setFormError(errors);
    if (Object.values(errors).some((e) => e)) {
      setFeedback({ type: "error", message: getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__FILL_REQUIRED_FIELDS) });
      return true;
    }
    return false;
  }, [formData]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleUpdate = useCallback(async () => {
    try {
      setLoading(true);

      if (isFormError()) {
        return;
      }

      const publications: IDbPublication[] = [];
      if (dialect === DB_DIALECTS.POSTGRES && formData.publication) {
        publications.push({ publication: formData.publication, slot: PUB_SLOT_NAME });
      }

      // Merge TLS settings back into Internal extra
      const internalParsed: Record<string, any> = formData.extra ? JSON.parse(formData.extra) : {};
      if (formData.sslmode) {
        internalParsed.sslmode = formData.sslmode;
        if (formData.ca && formData.sslmode !== "disable") {
          internalParsed.ca = formData.ca;
        } else {
          delete internalParsed.ca;
        }
      } else {
        delete internalParsed.sslmode;
        delete internalParsed.ca;
      }

      await api.dbCredentialsMgr.updateDbDetails({
        id: db.id,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        vocabSchemas: formData.vocabSchemas,
        extra: { Internal: internalParsed },
        publications,
      });
      setFeedback({
        type: "success",
        message: getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__SUCCESS, [db.code]),
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
          message: getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__ERROR),
          description: getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [formData, dialect, isFormError]);

  return (
    <Dialog
      className="edit-db-dialog"
      title={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__TITLE)}
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
                  required
                  error={formError.name}
                  value={formData.name}
                  onChange={(event) => handleFormDataChange({ name: event.target.value })}
                />
                {formError.name && (
                  <FormHelperText error>
                    {getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__DATABASE_NAME_REQUIRED)}
                  </FormHelperText>
                )}
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
                      required
                      error={formError.host}
                      value={formData.host}
                      onChange={(event) => handleFormDataChange({ host: event.target.value })}
                    />
                    {formError.host && (
                      <FormHelperText error>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__HOST_REQUIRED)}</FormHelperText>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PORT)}</b>
                  </div>
                  <div style={{ marginBottom: "32px" }}>
                    <TextField
                      variant="standard"
                      required
                      error={formError.port}
                      type="number"
                      sx={{ width: "150px" }}
                      value={formData.port}
                      onChange={(event) => handleFormDataChange({ port: Number(event.target.value) })}
                    />
                    {formError.port && (
                      <FormHelperText error>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PORT_REQUIRED)}</FormHelperText>
                    )}
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
                    <TextField
                      {...params}
                      variant="standard"
                      helperText={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PRESS_ENTER)}
                    />
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
            <div style={{ marginBottom: "32px" }}>
              <div style={{ marginBottom: "16px" }}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__TLS_SSL)}</b>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <FormControl variant="standard" sx={{ width: "250px" }}>
                  <InputLabel id="sslmode-select-label">
                    {getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__SSL_MODE)}
                  </InputLabel>
                  <Select
                    labelId="sslmode-select-label"
                    id="sslmode-select"
                    value={formData.sslmode}
                    onChange={(event) => handleFormDataChange({ sslmode: event.target?.value })}
                  >
                    {SSL_MODES.map((mode) => (
                      <MenuItem value={mode.key} key={mode.key || "__none__"}>
                        {mode.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              {formData.sslmode && formData.sslmode !== "disable" && (
                <div>
                  <TextField
                    label={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CA_CERTIFICATE)}
                    variant="standard"
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={10}
                    required={formData.sslmode === "verify-ca" || formData.sslmode === "verify-full"}
                    error={formError.ca}
                    value={formData.ca}
                    onChange={(event) => handleFormDataChange({ ca: event.target?.value })}
                    helperText={
                      formError.ca
                        ? getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CA_REQUIRED)
                        : getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CA_HELPERTEXT)
                    }
                  />
                </div>
              )}
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
