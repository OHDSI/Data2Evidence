import React, { FC, useCallback, useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import Divider from "@mui/material/Divider";
import { Box, Button, Dialog, InputLabel, MenuItem, Select, TextField } from "@portal/components";
import {
  AUTHENTICATION_MODES,
  AuthenticationMode,
  CREDENTIAL_SERVICE_SCOPES,
  CREDENTIAL_USER_SCOPES,
  CloseDialogType,
  Feedback,
  IDatabase,
  IDbCredential,
  IDbCredentialAdd,
  SERVICE_SCOPE_TYPES,
  USER_SCOPE_TYPES,
} from "../../../../types";
import { api } from "../../../../axios/api";
import "./EditDbCredentialsDialog.scss";
import { DbCredentialProcessor } from "../CredentialProcessor";
import { validateCredentials } from "../CredentialValidator";
import { useTranslation } from "../../../../contexts";

interface EditDbCredentialDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  db: IDatabase;
}

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
  //   userScope: USER_SCOPE_TYPES.READ,
  //   serviceScope: SERVICE_SCOPE_TYPES.DATA_PLATFORM,
  // },
];

interface FormData {
  authenticationMode: AuthenticationMode;
  credentials: IDbCredentialAdd[];
}

const EMPTY_FORM_DATA: FormData = {
  authenticationMode: AUTHENTICATION_MODES.PASSWORD,
  credentials: EMPTY_CREDENTIALS,
};

export const EditDbCredentialsDialog: FC<EditDbCredentialDialogProps> = ({ open, onClose, db }) => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const dbCredentialProcessor = new DbCredentialProcessor();

  useEffect(() => {
    if (open) {
      const { authenticationMode } = db;
      setFormData({ ...EMPTY_FORM_DATA, authenticationMode });
      setFeedback({});
      setLoading(false);
    }
  }, [open, db]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleAuthenticationModeChange = useCallback(
    (authenticationMode: string) => {
      handleFormDataChange({
        authenticationMode,
        credentials: authenticationMode === AUTHENTICATION_MODES.PASSWORD ? EMPTY_CREDENTIALS : [],
      });
    },
    [handleFormDataChange]
  );

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

      if (formData.authenticationMode === AUTHENTICATION_MODES.PASSWORD) {
        if (!validateCredentials(formData.credentials, setFeedback)) {
          return;
        }
      }

      const encryptedCredentials = formData.credentials
        .filter((cred) => Boolean(cred.username))
        .map(async (cred: IDbCredential) => dbCredentialProcessor.encryptDbCredential(cred));
      const credentials = await Promise.all(encryptedCredentials);

      await api.dbCredentialsMgr.updateDbCredentials({
        id: db.id,
        authenticationMode: formData.authenticationMode,
        credentials,
      });
      setFeedback({
        type: "success",
        message: getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__SUCCESS, [db.code]),
      });

      handleClose("success");
    } catch (err: any) {
      const message = err?.data?.message || err?.data?.error_description;
      if (message) {
        setFeedback({ type: "error", message });
      } else {
        console.log("There is an error in updating password", err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__ERROR),
          description: getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [formData.credentials, formData.authenticationMode, db, getText]);

  return (
    <Dialog
      className="edit-db-dialog"
      title={getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__EDIT_DATABASE_CREDENTIALS)}
      closable
      fullWidth
      maxWidth={formData.authenticationMode === AUTHENTICATION_MODES.JWT ? "sm" : "md"}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="edit-db-dialog__content">
        <Box mb={4}>
          <label className="database-code__label">{getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__DATABASE_CODE)}</label>
          <label className="database-code-value__label">{db.code}</label>
        </Box>
        <Box mb={4} sx={{ width: "250px" }} hidden={db.dialect !== "hana"}>
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
        </Box>
        <Box mb={4} hidden={formData.authenticationMode !== AUTHENTICATION_MODES.PASSWORD}>
          <Box mb={2}>
            <b>{getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__CREDENTIALS)}</b>
          </Box>
          {formData?.credentials?.map((cred, index) => (
            <Box key={index} display="flex" gap={3} mb={1}>
              <Box sx={{ width: "100px" }}>
                <FormControl fullWidth variant="standard">
                  <InputLabel id="user-scope-label">
                    {getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__PRIVILEGE)}
                  </InputLabel>
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
              </Box>
              <Box sx={{ width: "100px" }} flex="1">
                <TextField
                  label={getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__USERNAME)}
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
              </Box>
              <Box sx={{ width: "200px" }}>
                <TextField
                  label={getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__PASSWORD)}
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
              </Box>
              <Box sx={{ width: "130px" }}>
                <FormControl fullWidth variant="standard">
                  <InputLabel id="service-scope-label">
                    {getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__SERVICE)}
                  </InputLabel>
                  <Select
                    labelId="service-scope-label"
                    id="service-scope"
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
                    value={cred.serviceScope}
                    onChange={(event) =>
                      handleFormDataChange({
                        credentials: [
                          ...formData.credentials.slice(0, index),
                          {
                            ...formData.credentials[index],
                            serviceScope: event.target?.value,
                          } as IDbCredential,
                          ...formData.credentials.slice(index + 1, formData.credentials.length),
                        ],
                      })
                    }
                  >
                    {CREDENTIAL_SERVICE_SCOPES.map((scope) => (
                      <MenuItem value={scope} key={scope}>
                        {scope}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          ))}
        </Box>
      </div>
      <Divider />

      <div className="edit-db-dialog__footer">
        <Box display="flex" gap={1} className="edit-db-dialog__footer-actions">
          <Button
            text={getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__CANCEL)}
            variant="outlined"
            onClick={() => handleClose("cancelled")}
            disabled={loading}
          />
          <Button text={getText(i18nKeys.EDIT_DB_CREDENTIAL_DIALOG__UPDATE)} onClick={handleUpdate} loading={loading} />
        </Box>
      </div>
    </Dialog>
  );
};
