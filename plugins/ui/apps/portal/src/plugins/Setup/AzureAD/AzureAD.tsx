import React, { FC, useCallback, useEffect, useState } from "react";
import { Button, Loader, TextField, Title } from "@portal/components";
import { useAzureAdConfigs } from "../../../hooks";
import { api } from "../../../axios/api";
import "./AzureAD.scss";
import { useTranslation } from "../../../contexts";

interface FormData {
  tenantViewerGroupId: string;
  systemAdminGroupId: string;
  userAdminGroupId: string;
}

const EMPTY_FORM_DATA: FormData = {
  tenantViewerGroupId: "",
  systemAdminGroupId: "",
  userAdminGroupId: "",
};

export const AzureAD: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [configs, loading, error] = useAzureAdConfigs();

  useEffect(() => {
    if (configs) {
      const saved: FormData = {
        tenantViewerGroupId: configs.find((c) => c.code === "ROLE_TENANT_VIEWER_GROUP_ID")?.value || "",
        systemAdminGroupId: configs.find((c) => c.code === "ROLE_SYSTEM_ADMIN_GROUP_ID")?.value || "",
        userAdminGroupId: configs.find((c) => c.code === "ROLE_USER_ADMIN_GROUP_ID")?.value || "",
      };
      setFormData(saved);
    } else {
      setFormData(EMPTY_FORM_DATA);
    }
  }, [configs]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await api.userMgmt.setupAzureAd(formData);
    } finally {
      setSaving(false);
    }
  }, [formData]);

  if (error) console.error(error.message);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="azure-ad">
          <div className="azure-ad__header">
            <Title>{getText(i18nKeys.AZURE_AD__TITLE)}</Title>
          </div>
          <div className="azure-ad__content">
            <div style={{ marginBottom: "32px" }}>
              <TextField
                label={getText(i18nKeys.AZURE_AD__TEXT_FIELD_1_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.tenantViewerGroupId}
                onChange={(event) => handleFormDataChange({ tenantViewerGroupId: event.target?.value })}
              />
            </div>
            <div style={{ marginBottom: "32px" }}>
              <TextField
                label={getText(i18nKeys.AZURE_AD__TEXT_FIELD_2_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.systemAdminGroupId}
                onChange={(event) => handleFormDataChange({ systemAdminGroupId: event.target?.value })}
              />
            </div>
            <div style={{ marginBottom: "32px" }}>
              <TextField
                label={getText(i18nKeys.AZURE_AD__TEXT_FIELD_3_LABEL)}
                variant="standard"
                sx={{ width: "100%" }}
                value={formData.userAdminGroupId}
                onChange={(event) => handleFormDataChange({ userAdminGroupId: event.target?.value })}
              />
            </div>
          </div>
          <div className="azure-ad__footer">
            <div style={{ display: "flex", gap: "8px" }} className="azure-ad__footer-actions">
              <Button text={getText(i18nKeys.AZURE_AD__SAVE)} onClick={handleSave} loading={saving} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
