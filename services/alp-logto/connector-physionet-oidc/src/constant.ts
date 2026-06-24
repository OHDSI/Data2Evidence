import type { ConnectorMetadata } from '@logto/connector-kit';
import { ConnectorConfigFormItemType, ConnectorPlatform } from '@logto/connector-kit';
import {
  tokenEndpointAuthOptionsFormItems,
  clientSecretFormItem,
  clientIdFormItem,
  tokenEndpointFormItem,
  authorizationEndpointFormItem,
  scopeFormItem,
} from '@logto/connector-oauth';

export const defaultMetadata: ConnectorMetadata = {
  id: 'physionet-oidc',
  target: 'physionet',
  platform: ConnectorPlatform.Universal,
  name: {
    en: 'PhysioNet (OIDC)',
    'zh-CN': 'PhysioNet (OIDC)',
  },
  logo: './logo.svg',
  logoDark: null,
  description: {
    en: 'OpenID Connect 1.0 federation to PhysioNet, with upstream access/refresh tokens exposed via globalThis.tokenMap so d2e can call PhysioNet APIs on behalf of the user.',
    'zh-CN': 'OpenID Connect 1.0 是基于 OAuth 2.0 协议的一个简单身份层。',
  },
  readme: './README.md',
  isStandard: true,
  formItems: [
    authorizationEndpointFormItem,
    tokenEndpointFormItem,
    clientIdFormItem,
    clientSecretFormItem,
    ...tokenEndpointAuthOptionsFormItems,
    {
      ...scopeFormItem,
      required: true,
    },
    {
      key: 'idTokenVerificationConfig',
      label: 'ID Token Verification Config',
      type: ConnectorConfigFormItemType.Json,
      required: true,
      defaultValue: {
        jwksUri: '<jwks-uri>',
      },
    },
    {
      key: 'authRequestOptionalConfig',
      label: 'Authentication Request Optional Config',
      type: ConnectorConfigFormItemType.Json,
      required: false,
      defaultValue: {},
    },
    {
      key: 'customConfig',
      label: 'Custom Config',
      type: ConnectorConfigFormItemType.Json,
      required: false,
      defaultValue: {},
    },
  ],
};

export const defaultTimeout = 5000;
