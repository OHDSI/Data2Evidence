import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import Divider from "@mui/material/Divider";
import { FormHelperText } from "@mui/material";
import { SxProps } from "@mui/system";
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@portal/components";
import omit from "lodash/omit";
import pick from "lodash/pick";
import React, { FC, useCallback, useEffect, useState } from "react";
import { api } from "../../../../axios/api";
import { PUB_SLOT_NAME } from "../../../../constant";
import { useTranslation } from "../../../../contexts";
import {
  AUTHENTICATION_MODES,
  CloseDialogType,
  CREDENTIAL_USER_SCOPES,
  DB_DIALECTS,
  DB_DIALECTS_KEY_VALUE,
  Feedback,
  IDatabase,
  IDbCredential,
  IDbCredentialAdd,
  IDbExtra,
  IDbExtraAdd,
  IDbPublication,
  INewDatabase,
  ITestConnection,
  SERVICE_SCOPE_TYPES,
  SSL_MODES,
  USER_SCOPE_TYPES,
} from "../../../../types";
import { isValidJson } from "../../../../utils";
import { DbCredentialProcessor } from "../CredentialProcessor";
import { isValidDbCode, validateCredentials } from "../CredentialValidator";
import { BigQueryForm } from "./BigQueryForm";
import "./SaveDbDialog.scss";

interface SaveDbDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

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

interface FormData extends Omit<IDatabase, "id" | "credentials.id" | "publications"> {
  publication: string;
  sslmode: string;
  ca: string;
}

interface FormError {
  code: boolean;
  host: boolean;
  port: boolean;
  name: boolean;
  ca: boolean;
}

const EMPTY_FORM_ERROR: FormError = {
  code: false,
  host: false,
  port: false,
  name: false,
  ca: false,
};

const dbCredentialProcessor = new DbCredentialProcessor();

const EMPTY_EXTRAS: IDbExtraAdd[] = [
  {
    value: "",
    serviceScope: SERVICE_SCOPE_TYPES.INTERNAL,
  },
  // {
  //   value: "",
  //   serviceScope: SERVICE_SCOPE_TYPES.DATA_PLATFORM,
  // },
];

const EMPTY_CREDENTIALS: IDbCredentialAdd[] = [
  {
    username: "",
    password: "",
    salt: "",
    userScope: USER_SCOPE_TYPES.ADMIN,
    serviceScope: SERVICE_SCOPE_TYPES.INTERNAL,
  },
  {
    username: "",
    password: "",
    salt: "",
    userScope: USER_SCOPE_TYPES.READ,
    serviceScope: SERVICE_SCOPE_TYPES.INTERNAL,
  },
  // {
  //   username: "",
  //   password: "",
  //   salt: "",
  //   userScope: USER_SCOPE_TYPES.DEFAULT,
  //   serviceScope: SERVICE_SCOPE_TYPES.DATA_PLATFORM,
  // },
];

const EMPTY_FORM_DATA: FormData = {
  host: "",
  port: 5432,
  code: "",
  name: "",
  dialect: DB_DIALECTS.POSTGRES,
  extra: EMPTY_EXTRAS,
  authenticationMode: AUTHENTICATION_MODES.PASSWORD,
  credentials: EMPTY_CREDENTIALS,
  vocabSchemas: [],
  publication: "",
  sslmode: "",
  ca: "",
};

interface ITestingResult {
  [key: string]: boolean;
}

export const SaveDbDialog: FC<SaveDbDialogProps> = ({ open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);

  const [testing, setTesting] = useState(false);
  const [testingResult, setTestingResult] = useState<ITestingResult>({});

  useEffect(() => {
    if (open) {
      setFormData(EMPTY_FORM_DATA);
      setFeedback({});
      setFormError(EMPTY_FORM_ERROR);
      handleDialectChange(EMPTY_FORM_DATA.dialect);
    }
  }, [open]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setTestingResult({});
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleDialectChange = useCallback(
    (dialect: string) => {
      handleFormDataChange({
        dialect,
        vocabSchemas: [],
        authenticationMode: AUTHENTICATION_MODES.PASSWORD,
        publication: "",
      });
    },
    [handleFormDataChange]
  );

  const handleAuthenticationModeChange = useCallback(
    (authenticationMode: string) => {
      handleFormDataChange({
        authenticationMode,
        credentials: authenticationMode === AUTHENTICATION_MODES.PASSWORD ? EMPTY_CREDENTIALS : [],
      });
    },
    [handleFormDataChange]
  );

  const isFormError = useCallback(() => {
    let errors: Partial<FormError> = {};

    if (!formData.code.trim()) {
      errors.code = true;
    }
    if (formData.dialect !== DB_DIALECTS.BIG_QUERY) {
      if (!formData.host.trim()) errors.host = true;
      if (!formData.port) errors.port = true;
      if (!formData.name.trim()) errors.name = true;
    }
    if ((formData.sslmode === "verify-ca" || formData.sslmode === "verify-full") && !formData.ca?.trim()) {
      errors.ca = true;
    }

    if (Object.keys(errors).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(errors as FormError) });
      return true;
    }

    return false;
  }, [formData]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      if (isFormError()) {
        return;
      }

      setFormError(EMPTY_FORM_ERROR);

      if (formData.dialect === DB_DIALECTS.BIG_QUERY) {
        formData.port = 0;
      }

      if (!isValidDbCode(formData.code, setFeedback)) {
        return;
      }

      if (formData.dialect !== DB_DIALECTS.BIG_QUERY && formData.authenticationMode === AUTHENTICATION_MODES.PASSWORD) {
        if (!validateCredentials(formData.credentials, setFeedback)) {
          return;
        }
      }
      const encryptedCredentials = formData.credentials
        .filter((cred) => Boolean(cred.username))
        .map(async (cred: IDbCredential) => dbCredentialProcessor.encryptDbCredential(cred));
      const credentials = await Promise.all(encryptedCredentials);

      const internalExtra = formData.extra.find((ext) => ext.serviceScope === SERVICE_SCOPE_TYPES.INTERNAL);
      const dataPlatformExtra = formData.extra.find((ext) => ext.serviceScope === SERVICE_SCOPE_TYPES.DATA_PLATFORM);

      const newExtra: { [key: string]: object } = {};
      if (internalExtra) {
        if (internalExtra.value) {
          if (!isValidJson(internalExtra.value)) {
            setFeedback({
              type: "error",
              message: getText(i18nKeys.SAVE_DB_DIALOG__ENTER_VALID_JSON_INTERNAL),
            });
            return;
          }
          newExtra["Internal"] = JSON.parse(internalExtra.value);
        } else {
          newExtra["Internal"] = {};
        }
      }

      // Merge TLS settings into Internal extra
      if (formData.sslmode) {
        if (!newExtra["Internal"]) newExtra["Internal"] = {};
        (newExtra["Internal"] as Record<string, any>).sslmode = formData.sslmode;
        if (formData.ca && formData.sslmode !== "disable") {
          (newExtra["Internal"] as Record<string, any>).ca = formData.ca;
        }
      }

      if (dataPlatformExtra) {
        if (dataPlatformExtra.value) {
          if (!isValidJson(dataPlatformExtra.value)) {
            setFeedback({
              type: "error",
              message: getText(i18nKeys.SAVE_DB_DIALOG__ENTER_VALID_JSON_DATA_PLATFORM),
            });
            return;
          }
          newExtra["DataPlatform"] = JSON.parse(dataPlatformExtra.value);
        } else {
          newExtra["DataPlatform"] = {};
        }
      }

      const publications: IDbPublication[] = [];
      if (formData.dialect === DB_DIALECTS.POSTGRES && formData.publication) {
        publications.push({ publication: formData.publication, slot: PUB_SLOT_NAME });
      }

      const params = omit(formData, "publication", "slot");
      const encrypted: INewDatabase = { ...params, extra: newExtra, credentials, publications };
      await api.dbCredentialsMgr.addDb(encrypted);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.SAVE_DB_DIALOG__SUCCESS),
        autoClose: 60000,
      });

      setFormData(EMPTY_FORM_DATA);

      handleClose("success");
    } catch (err: any) {
      const message = err?.data?.message || err?.data?.error_description || err.message;
      if (message) {
        setFeedback({ type: "error", message });
      } else {
        console.error("There is an error in saving database", err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.SAVE_DB_DIALOG__ERROR),
          description: getText(i18nKeys.SAVE_DB_DIALOG__ERROR_MESSAGE),
        });
      }
    } finally {
      setSaving(false);
    }
  }, [handleClose, formData, setFeedback, getText, isFormError]);

  const handleTestConnection = useCallback(async () => {
    try {
      setTesting(true);
      setFeedback({});

      const credentials = formData.credentials.filter((x) => Boolean(x.username));
      if (credentials.length === 0) {
        setFeedback({ type: "error", message: getText(i18nKeys.SAVE_DB_DIALOG__TEST_CONNECTION_VALIDATE) });
        return;
      }

      // Parse extra JSON from Extra (Internal) if present
      const internalExtra = formData.extra.find((ext) => ext.serviceScope === SERVICE_SCOPE_TYPES.INTERNAL);
      let extra: Record<string, any> | undefined;
      if (internalExtra?.value) {
        try {
          extra = JSON.parse(internalExtra.value);
        } catch (err) {
          console.error("Invalid extra JSON", err);
          setFeedback({
            type: "error",
            message: getText(i18nKeys.SAVE_DB_DIALOG__EXTRA_INVALID_JSON),
          });
          return;
        }
      }

      // Merge TLS settings for test connection
      if (formData.sslmode) {
        extra = extra || {};
        extra.sslmode = formData.sslmode;
        if (formData.ca && formData.sslmode !== "disable") {
          extra.ca = formData.ca;
        }
      }

      const testResult: ITestingResult = {};
      const errorMessages: string[] = [];
      for (const cred of credentials) {
        try {
          const params: ITestConnection = {
            host: formData.host,
            port: formData.port,
            database: formData.name,
            user: cred.username,
            password: cred.password,
            ...(extra && { extra }),
          };
          const result = await api.dbCredentialsMgr.testConnection(params);

          testResult[cred.username] = result.success;
          setTestingResult((x) => ({ ...x, [cred.username]: result.success }));
          if (!result.success && result.error) {
            errorMessages.push(result.error);
          }
        } catch (err: any) {
          testResult[cred.username] = false;
          setTestingResult((x) => ({ ...x, [cred.username]: false }));
          const errMsg = err?.data?.error || err?.data?.message;
          if (errMsg) {
            errorMessages.push(errMsg);
          }
        }
      }

      if (Object.keys(testResult).length > 0) {
        if (Object.values(testResult).every((x) => x)) {
          setFeedback({
            type: "success",
            message: getText(i18nKeys.SAVE_DB_DIALOG__CONNECTION_VERIFIED),
            autoClose: 5000,
          });
        } else {
          setFeedback({
            type: "error",
            message:
              errorMessages.length > 0
                ? [...new Set(errorMessages)].join("; ")
                : getText(i18nKeys.SAVE_DB_DIALOG__CONNECTION_FAILED),
          });
        }
      }
    } finally {
      setTesting(false);
    }
  }, [formData]);

  return (
    <Dialog
      className="save-db-dialog"
      title={getText(i18nKeys.SAVE_DB_DIALOG__ADD_DATABASE)}
      feedback={feedback}
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <div className="save-db-dialog__content">
        <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
          <div style={{ flex: 1 }}>
            <TextField
              label={getText(i18nKeys.SAVE_DB_DIALOG__DATABASE_ID)}
              variant="standard"
              required
              fullWidth
              value={formData.code}
              onChange={(event) => handleFormDataChange({ code: event.target?.value })}
              error={formError.code}
            />
            {formError.code && <FormHelperText error>{getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)}</FormHelperText>}
          </div>
          <FormControl fullWidth variant="standard" sx={{ width: "300px" }}>
            <InputLabel id="dialect-select-label">{getText(i18nKeys.SAVE_DB_DIALOG__DIALECT)}</InputLabel>
            <Select
              labelId="dialect-select-label"
              id="dialect-select"
              value={formData.dialect}
              onChange={(event) => handleDialectChange(event.target?.value)}
            >
              {DB_DIALECTS_KEY_VALUE.map((dialect) => (
                <MenuItem value={dialect.key} key={dialect.key}>
                  {dialect.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        {formData.dialect === DB_DIALECTS.BIG_QUERY ? (
          <BigQueryForm data={pick(formData, "host", "name")} onChange={(changes) => handleFormDataChange(changes)} />
        ) : (
          <>
            <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label={getText(i18nKeys.SAVE_DB_DIALOG__HOST)}
                  variant="standard"
                  required
                  fullWidth
                  value={formData.host}
                  onChange={(event) => handleFormDataChange({ host: event.target?.value })}
                  error={formError.host}
                />
                {formError.host && (
                  <FormHelperText error>{getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)}</FormHelperText>
                )}
              </div>
              <div>
                <TextField
                  label={getText(i18nKeys.SAVE_DB_DIALOG__PORT)}
                  variant="standard"
                  required
                  type="number"
                  sx={{ width: "150px" }}
                  value={formData.port}
                  onChange={(event) => handleFormDataChange({ port: Number(event.target?.value || 0) })}
                  error={formError.port}
                />
                {formError.port && (
                  <FormHelperText error>{getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)}</FormHelperText>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label={getText(i18nKeys.SAVE_DB_DIALOG__DATABASE_NAME)}
                  variant="standard"
                  required
                  fullWidth
                  value={formData.name}
                  onChange={(event) => handleFormDataChange({ name: event.target?.value })}
                  error={formError.name}
                />
                {formError.name && (
                  <FormHelperText error>{getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)}</FormHelperText>
                )}
              </div>
            </div>

            <div style={{ fontWeight: "bold" }}>{getText(i18nKeys.SAVE_DB_DIALOG__VOCAB_SCHEMAS)}</div>
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
                    helperText={getText(i18nKeys.SAVE_DB_DIALOG__PRESS_ENTER)}
                  />
                )}
                value={formData.vocabSchemas}
                onChange={(_, vocabSchemas) => handleFormDataChange({ vocabSchemas })}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: "32px" }}>
          <div style={{ marginBottom: "16px" }}>
            <b>{getText(i18nKeys.SAVE_DB_DIALOG__EXTRA)}</b>
          </div>
          {formData?.extra?.map((extra, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <TextField
                label={getText(i18nKeys.SAVE_DB_DIALOG__VALUE)}
                variant="standard"
                fullWidth
                value={extra.value}
                onChange={(event) =>
                  handleFormDataChange({
                    extra: [
                      ...formData.extra.slice(0, index),
                      {
                        ...formData.extra[index],
                        value: event.target?.value,
                      } as IDbExtra,
                      ...formData.extra.slice(index + 1, formData.extra.length),
                    ],
                  })
                }
              />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "32px" }} hidden={formData.dialect === DB_DIALECTS.BIG_QUERY}>
          <div style={{ marginBottom: "16px" }}>
            <b>{getText(i18nKeys.SAVE_DB_DIALOG__TLS_SSL)}</b>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <FormControl variant="standard" sx={{ width: "250px" }}>
              <InputLabel id="sslmode-select-label">{getText(i18nKeys.SAVE_DB_DIALOG__SSL_MODE)}</InputLabel>
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
                label={getText(i18nKeys.SAVE_DB_DIALOG__CA_CERTIFICATE)}
                variant="standard"
                fullWidth
                multiline
                minRows={3}
                maxRows={10}
                required={formData.sslmode === "verify-ca" || formData.sslmode === "verify-full"}
                value={formData.ca}
                onChange={(event) => handleFormDataChange({ ca: event.target?.value })}
                error={formError.ca}
                helperText={
                  formError.ca
                    ? getText(i18nKeys.ADD_STUDY_DIALOG__REQUIRED)
                    : getText(i18nKeys.SAVE_DB_DIALOG__CA_HELPERTEXT)
                }
              />
            </div>
          )}
        </div>
        <div style={{ marginBottom: "32px", width: "250px" }} hidden={formData.dialect !== DB_DIALECTS.HANA}>
          <FormControl fullWidth variant="standard">
            <InputLabel id="authentication-mode-select-label">
              {getText(i18nKeys.SAVE_DB_DIALOG__AUTHENTICATION_MODE)}
            </InputLabel>
            <Select
              labelId="authentication-mode-select-label"
              id="authentication-mode-select"
              value={formData.authenticationMode}
              onChange={(event) => handleAuthenticationModeChange(event.target?.value)}
            >
              {Object.values(AUTHENTICATION_MODES).map((authenticationMode) => (
                <MenuItem value={authenticationMode} key={authenticationMode}>
                  {authenticationMode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div
          style={{ marginBottom: "32px" }}
          hidden={
            formData.authenticationMode !== AUTHENTICATION_MODES.PASSWORD || formData.dialect === DB_DIALECTS.BIG_QUERY
          }
        >
          <div style={{ marginBottom: "16px" }}>
            <b>{getText(i18nKeys.SAVE_DB_DIALOG__CREDENTIALS)}</b>
          </div>
          {formData?.credentials?.map((cred, index) => (
            <div key={index} style={{ display: "flex", gap: "24px", marginBottom: "8px" }}>
              <div style={{ width: "100px" }}>
                <FormControl fullWidth variant="standard">
                  <InputLabel id="user-scope-label">{getText(i18nKeys.SAVE_DB_DIALOG__PRIVILEGE)}</InputLabel>
                  <Select
                    labelId="user-scope-label"
                    id="user-scope"
                    readOnly
                    inputProps={{
                      tabIndex: -1,
                    }}
                    sx={{
                      "::before, ::after": {
                        borderBottom: "0 !important",
                      },
                      ".MuiSvgIcon-root": {
                        display: "none",
                      },
                    }}
                    value={cred.userScope}
                    onChange={(event) =>
                      handleFormDataChange({
                        credentials: [
                          ...formData.credentials.slice(0, index),
                          {
                            ...formData.credentials[index],
                            userScope: event.target?.value,
                          } as IDbCredential,
                          ...formData.credentials.slice(index + 1, formData.credentials.length),
                        ],
                      })
                    }
                  >
                    {CREDENTIAL_USER_SCOPES.map((scope) => (
                      <MenuItem value={scope} key={scope}>
                        {scope}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              <div style={{ flex: "1" }}>
                <TextField
                  label={getText(i18nKeys.SAVE_DB_DIALOG__USERNAME)}
                  variant="standard"
                  fullWidth
                  value={cred.username}
                  onChange={(event) =>
                    handleFormDataChange({
                      credentials: [
                        ...formData.credentials.slice(0, index),
                        {
                          ...formData.credentials[index],
                          username: event.target?.value,
                        } as IDbCredential,
                        ...formData.credentials.slice(index + 1, formData.credentials.length),
                      ],
                    })
                  }
                />
              </div>
              <div style={{ width: "200px" }}>
                <TextField
                  label={getText(i18nKeys.SAVE_DB_DIALOG__PASSWORD)}
                  variant="standard"
                  type="password"
                  sx={{ width: "200px" }}
                  value={cred.password}
                  onChange={(event) =>
                    handleFormDataChange({
                      credentials: [
                        ...formData.credentials.slice(0, index),
                        {
                          ...formData.credentials[index],
                          password: event.target?.value,
                        } as IDbCredential,
                        ...formData.credentials.slice(index + 1, formData.credentials.length),
                      ],
                    })
                  }
                />
              </div>
              <div style={{ width: "50px", alignSelf: "flex-end" }}>
                {Object.keys(testingResult).includes(cred.username) && (
                  <Tooltip
                    title={
                      testingResult[cred.username]
                        ? getText(i18nKeys.SAVE_DB_DIALOG__CONNECTION_VERIFIED)
                        : getText(i18nKeys.SAVE_DB_DIALOG__CONNECTION_FAILED)
                    }
                    placement="top"
                  >
                    {testingResult[cred.username] ? (
                      <CheckCircleIcon sx={{ width: 28, height: 28, color: "green" }} />
                    ) : (
                      <WarningIcon sx={{ width: 28, height: 28, color: "red" }} />
                    )}
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "32px" }} hidden={formData.dialect !== DB_DIALECTS.POSTGRES}>
          <div style={{ marginBottom: "16px" }}>
            <b>{getText(i18nKeys.SAVE_DB_DIALOG__CACHE_REPLICATION)}</b>
          </div>
          <div style={{ marginBottom: "8px", display: "flex", gap: "32px" }}>
            <TextField
              label={getText(i18nKeys.SAVE_DB_DIALOG__PUBLICATION)}
              variant="standard"
              sx={{ minWidth: "300px" }}
              value={formData.publication}
              onChange={(event) => handleFormDataChange({ publication: event.target?.value })}
            />
          </div>
        </div>
      </div>
      <div className="save-db-dialog__footer">
        <div style={{ display: "flex", gap: "8px" }} className="save-db-dialog__footer-actions">
          {formData.dialect !== DB_DIALECTS.BIG_QUERY && (
            <Button
              text={getText(i18nKeys.SAVE_DB_DIALOG__TEST_CONNECTION)}
              variant="outlined"
              loading={testing}
              onClick={handleTestConnection}
              {...(!testing && Object.values(testingResult).length > 0 && Object.values(testingResult).every((x) => x)
                ? { startIcon: <CheckCircleIcon sx={{ width: 28, height: 28, color: "green" }} /> }
                : {})}
            />
          )}
          <Button
            text={getText(i18nKeys.SAVE_DB_DIALOG__CANCEL)}
            variant="outlined"
            onClick={() => handleClose("cancelled")}
          />
          <Button text={getText(i18nKeys.SAVE_DB_DIALOG__SAVE)} onClick={handleSave} loading={saving} />
        </div>
      </div>
    </Dialog>
  );
};
