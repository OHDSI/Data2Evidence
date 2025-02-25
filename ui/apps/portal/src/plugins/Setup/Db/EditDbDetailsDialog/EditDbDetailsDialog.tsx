import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Divider from "@mui/material/Divider";
import { SxProps } from "@mui/material";
import { Autocomplete, Box, Button, Chip, Dialog, TextArea, TextField } from "@portal/components";
import { CloseDialogType, Feedback, IDatabase, IDbPublication } from "../../../../types";
import { api } from "../../../../axios/api";
import { isEqual } from "lodash";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { useTranslation } from "../../../../contexts";
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
  slot: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  host: "",
  port: 5432,
  vocabSchemas: [],
  extra: "",
  publication: "",
  slot: "",
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
  const [vocabSchemaOptions, setVocabSchemaOptions] = useState<string[]>([]);
  const publication = db.publications?.length > 0 ? db.publications[0].publication : "";
  const slot = db.publications?.length > 0 ? db.publications[0].slot : "";

  const hasChanges = useMemo(
    () =>
      !isEqual(db.name, formData.name) ||
      !isEqual(db.host, formData.host) ||
      !isEqual(db.port, formData.port) ||
      (!isEqual(db.vocabSchemas, formData.vocabSchemas) && formData.vocabSchemas.length > 0) ||
      originalExtra !== formData.extra ||
      !isEqual(publication, formData.publication) ||
      !isEqual(slot, formData.slot),
    [db, formData, originalExtra]
  );

  useEffect(() => {
    if (open) {
      if (db.dialect === "hana") {
        setVocabSchemaOptions(["CDMVOCAB"]);
      } else {
        setVocabSchemaOptions(["cdmvocab"]);
      }
      const extraStr = JSON.stringify(mapExtraToHashmap(db.extra), null, 4);
      setFormData({
        name: db.name,
        host: db.host,
        port: db.port,
        vocabSchemas: db.vocabSchemas,
        extra: extraStr,
        publication: publication,
        slot: slot,
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
      if (formData.publication) {
        publications.push({ publication: formData.publication, slot: formData.slot });
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
  }, [formData]);

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
        <Box mb={4}>
          <label className="database-code__label">Database Code</label>
          <label className="database-code-value__label">{db.code}</label>
        </Box>
        <Box mb={4}>
          <Box mb={2}>
            <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__DATABASE_NAME)}</b>
          </Box>
          <Box mb={4}>
            <TextField
              fullWidth
              variant="standard"
              value={formData.name}
              onChange={(event) => handleFormDataChange({ name: event.target.value })}
            />
          </Box>

          <Box mb={2} display="flex" gap={4}>
            <Box sx={{ width: "100%" }}>
              <Box mb={2}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__HOST)}</b>
              </Box>
              <Box mb={4}>
                <TextField
                  fullWidth
                  variant="standard"
                  value={formData.host}
                  onChange={(event) => handleFormDataChange({ host: event.target.value })}
                />
              </Box>
            </Box>
            <Box>
              <Box mb={2}>
                <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PORT)}</b>
              </Box>
              <Box mb={4}>
                <TextField
                  variant="standard"
                  type="number"
                  sx={{ width: "150px" }}
                  value={formData.port}
                  onChange={(event) => handleFormDataChange({ port: Number(event.target.value) })}
                />
              </Box>
            </Box>
          </Box>

          <Box mb={2}>
            <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__VOCAB_SCHEMA)}</b>
          </Box>
          <Box mb={4}>
            <Autocomplete
              multiple
              freeSolo
              options={vocabSchemaOptions}
              sx={styles}
              id="autocomplete-vocab-schemas"
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => <TextField {...params} variant="standard" />}
              value={formData.vocabSchemas}
              onChange={(event, vocabSchemas) => handleFormDataChange({ vocabSchemas })}
            />
          </Box>
        </Box>
        <Box mb={4}>
          <Box mb={2}>
            <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__EXTRA)}</b>
          </Box>
          <Box>
            <TextArea
              rows={10}
              value={formData.extra}
              onChange={(event) => handleFormDataChange({ extra: event.target.value })}
            />
          </Box>
        </Box>
        <Box mb={4}>
          <Box mb={2}>
            <b>{getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__CACHE_REPLICATION)}</b>
          </Box>
          <Box mb={1} display="flex" gap={4}>
            <TextField
              label={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__PUBLICATION)}
              variant="standard"
              sx={{ minWidth: "300px" }}
              value={formData.publication}
              onChange={(event) => handleFormDataChange({ publication: event.target?.value })}
            />
            <TextField
              label={getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__SLOT)}
              variant="standard"
              sx={{ minWidth: "300px" }}
              value={formData.slot}
              onChange={(event) => handleFormDataChange({ slot: event.target?.value })}
            />
          </Box>
        </Box>
      </div>
      <Divider />

      <div className="edit-db-dialog__footer">
        <Box display="flex" gap={1} className="edit-db-dialog__footer-actions">
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
        </Box>
      </div>
    </Dialog>
  );
};
