import type { ConnectorMetadata } from "@logto/connector-kit";
import {
  ConnectorPlatform,
  ConnectorConfigFormItemType,
} from "@logto/connector-kit";

export const graphAPIEndpoint = "https://graph.microsoft.com/v1.0/me";
export const scopes = ["openid", "profile", "email", "offline_access"];

export const defaultMetadata: ConnectorMetadata = {
  id: "azuread-alp",
  target: "azuread-alp",
  platform: ConnectorPlatform.Web,
  name: {
    en: "Data2Evidence",
  },
  logo: "./logo.svg",
  logoDark: null,
  description: {
    en: "Integrate the Data2Evidence with Microsoft Entra ID to ensure only authorized users can access the application.",
  },
  readme: "./README.md",
  formItems: [
    {
      key: "clientId",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client ID",
      placeholder: "<client-id>",
    },
    {
      key: "clientSecret",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client Secret",
      placeholder: "<client-secret>",
    },
    {
      key: "cloudInstance",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Cloud Instance",
      placeholder: "https://login.microsoftonline.com",
      defaultValue: "https://login.microsoftonline.com",
    },
    {
      key: "tenantId",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Tenant ID",
      placeholder: "<tenant-id>",
    },
  ],
};

export const defaultTimeout = 5000;
