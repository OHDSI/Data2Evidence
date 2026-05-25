import type { ConnectorMetadata } from "@logto/connector-kit";
import {
  ConnectorPlatform,
  ConnectorConfigFormItemType,
} from "@logto/connector-kit";

export const defaultScopes = ["openid", "profile", "email", "offline_access","User.Read"];

export const defaultMetadata: ConnectorMetadata = {
  id: "entra-external-id-alp",
  target: "entra-external-id-alp",
  platform: ConnectorPlatform.Web,
  name: {
    en: "Microsoft Entra External ID",
  },
  logo: "./logo.svg",
  logoDark: null,
  description: {
    en: "Sign in to Data2Evidence with Microsoft Entra External ID (CIAM) credentials.",
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
      key: "tenantSubdomain",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Tenant Subdomain",
      placeholder: "<tenant-subdomain>",
      description:
        "The subdomain portion of your CIAM authority (e.g. 'contoso' for contoso.ciamlogin.com).",
    },
    {
      key: "tenantId",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Tenant ID",
      placeholder: "<tenant-id>",
    },
    {
      key: "scopes",
      type: ConnectorConfigFormItemType.Text,
      required: false,
      label: "Scopes",
      placeholder: "openid,profile,email,offline_access,User.Read",
      description:
        "Comma-separated list of OAuth scopes. Leave empty to use default scopes.",
    },
  ],
};
