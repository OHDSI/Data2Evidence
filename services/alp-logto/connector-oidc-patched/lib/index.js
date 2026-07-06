// src/index.ts
import { assert, conditional } from "@silverhand/essentials";
import {
  ConnectorError as ConnectorError2,
  ConnectorErrorCodes as ConnectorErrorCodes2,
  validateConfig,
  ConnectorType,
  jsonGuard
} from "@logto/connector-kit";
import { constructAuthorizationUri } from "@logto/connector-oauth";
import { generateStandardId } from "@logto/shared/universal";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { HTTPError } from "ky";

// src/constant.ts
import { ConnectorConfigFormItemType, ConnectorPlatform } from "@logto/connector-kit";
import {
  tokenEndpointAuthOptionsFormItems,
  clientSecretFormItem,
  clientIdFormItem,
  tokenEndpointFormItem,
  authorizationEndpointFormItem,
  scopeFormItem
} from "@logto/connector-oauth";
var defaultMetadata = {
  id: "oidc",
  target: "oidc",
  platform: ConnectorPlatform.Universal,
  name: {
    en: "OIDC",
    "zh-CN": "OIDC"
  },
  logo: "./logo.svg",
  logoDark: null,
  description: {
    en: "OpenID Connect 1.0 is a simple identity layer on top of the OAuth 2.0 protocol.",
    "zh-CN": "OpenID Connect 1.0 \u662F\u57FA\u4E8E OAuth 2.0 \u534F\u8BAE\u7684\u4E00\u4E2A\u7B80\u5355\u8EAB\u4EFD\u5C42\u3002"
  },
  readme: "./README.md",
  isStandard: true,
  formItems: [
    authorizationEndpointFormItem,
    tokenEndpointFormItem,
    clientIdFormItem,
    clientSecretFormItem,
    ...tokenEndpointAuthOptionsFormItems,
    {
      ...scopeFormItem,
      required: true
    },
    {
      key: "idTokenVerificationConfig",
      label: "ID Token Verification Config",
      type: ConnectorConfigFormItemType.Json,
      required: true,
      defaultValue: {
        jwksUri: "<jwks-uri>"
      }
    },
    {
      key: "authRequestOptionalConfig",
      label: "Authentication Request Optional Config",
      type: ConnectorConfigFormItemType.Json,
      required: false,
      defaultValue: {}
    },
    {
      key: "customConfig",
      label: "Custom Config",
      type: ConnectorConfigFormItemType.Json,
      required: false,
      defaultValue: {}
    }
  ]
};

// src/types.ts
import { z } from "zod";
import { oauth2ConfigGuard } from "@logto/connector-oauth";
var scopeOpenid = "openid";
var delimiter = /[ +]/;
var scopePostProcessor = (scope) => {
  const splitScopes = scope.split(delimiter).filter(Boolean);
  if (!splitScopes.includes(scopeOpenid)) {
    return [...splitScopes, scopeOpenid].join(" ");
  }
  return scope;
};
var idTokenProfileStandardClaimsGuard = z.object({
  sub: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  email_verified: z.boolean().nullish(),
  phone: z.string().nullish(),
  phone_verified: z.boolean().nullish(),
  picture: z.string().nullish(),
  profile: z.string().nullish(),
  nonce: z.string().nullish()
});
var userProfileGuard = z.object({
  id: z.preprocess(String, z.string()),
  email: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().optional()
});
var authRequestOptionalConfigGuard = z.object({
  responseMode: z.string(),
  display: z.string(),
  prompt: z.string(),
  maxAge: z.string(),
  uiLocales: z.string(),
  idTokenHint: z.string(),
  loginHint: z.string(),
  acrValues: z.string()
}).partial();
var idTokenVerificationConfigGuard = z.object({ jwksUri: z.string() }).merge(
  z.object({
    issuer: z.string().or(z.string().array()),
    audience: z.string().or(z.string().array()),
    algorithms: z.string().array(),
    clockTolerance: z.string().or(z.number()),
    crit: z.record(z.string(), z.boolean()),
    currentDate: z.date().default(/* @__PURE__ */ new Date()),
    maxTokenAge: z.string().or(z.number()),
    subject: z.string(),
    typ: z.string()
  }).partial()
);
var oidcConnectorConfigGuard = oauth2ConfigGuard.extend({
  // Override `scope` to ensure it contains 'openid'.
  scope: z.string().transform(scopePostProcessor),
  idTokenVerificationConfig: idTokenVerificationConfigGuard,
  authRequestOptionalConfig: authRequestOptionalConfigGuard.optional(),
  customConfig: z.record(z.string()).optional()
});
var authResponseGuard = z.object({
  code: z.string(),
  state: z.string().optional()
}).catchall(z.string());
var accessTokenResponseGuard = z.object({
  id_token: z.string(),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  code: z.string().optional()
});

// src/utils.ts
import { ConnectorError, ConnectorErrorCodes, parseJson } from "@logto/connector-kit";
import { requestTokenEndpoint } from "@logto/connector-oauth";
var accessTokenResponseHandler = async (response) => {
  const result = accessTokenResponseGuard.safeParse(parseJson(await response.text()));
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }
  return result.data;
};
var getIdToken = async (config, data, redirectUri) => {
  const result = authResponseGuard.safeParse(data);
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, data);
  }
  const { code } = result.data;
  const {
    tokenEndpoint,
    grantType,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod,
    clientSecretJwtSigningAlgorithm,
    customConfig
  } = config;
  const tokenResponse = await requestTokenEndpoint({
    tokenEndpoint,
    tokenEndpointAuthOptions: {
      method: tokenEndpointAuthMethod,
      clientSecretJwtSigningAlgorithm
    },
    tokenRequestBody: {
      grantType,
      code,
      redirectUri,
      clientId,
      clientSecret,
      ...customConfig
    }
  });
  return accessTokenResponseHandler(tokenResponse);
};

// src/index.ts
var generateNonce = () => generateStandardId();
var getAuthorizationUri = (getConfig) => async ({ state, redirectUri }, setSession) => {
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, oidcConnectorConfigGuard);
  const parsedConfig = oidcConnectorConfigGuard.parse(config);
  const nonce = generateNonce();
  assert(
    setSession,
    new ConnectorError2(ConnectorErrorCodes2.NotImplemented, {
      message: "Function `setSession()` is not implemented"
    })
  );
  await setSession({ nonce, redirectUri });
  const {
    authorizationEndpoint,
    responseType,
    clientId,
    scope,
    customConfig,
    authRequestOptionalConfig
  } = parsedConfig;
  return constructAuthorizationUri(authorizationEndpoint, {
    responseType,
    clientId,
    scope,
    redirectUri,
    state,
    nonce,
    ...authRequestOptionalConfig,
    ...customConfig
  });
};
var getUserInfo = (getConfig) => async (data, getSession) => {
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, oidcConnectorConfigGuard);
  const parsedConfig = oidcConnectorConfigGuard.parse(config);
  assert(
    getSession,
    new ConnectorError2(ConnectorErrorCodes2.NotImplemented, {
      message: "Function `getSession()` is not implemented."
    })
  );
  const { nonce: validationNonce, redirectUri } = await getSession();
  assert(
    redirectUri,
    new ConnectorError2(ConnectorErrorCodes2.General, {
      message: "CAN NOT find 'redirectUri' from connector session."
    })
  );
  const { id_token: idToken, access_token: accessToken, refresh_token: refreshToken } = await getIdToken(parsedConfig, data, redirectUri);
  if (!idToken) {
    throw new ConnectorError2(ConnectorErrorCodes2.SocialIdTokenInvalid, {
      message: "Cannot find ID Token."
    });
  }
  try {
    const { payload } = await jwtVerify(
      idToken,
      createRemoteJWKSet(new URL(parsedConfig.idTokenVerificationConfig.jwksUri)),
      {
        ...parsedConfig.idTokenVerificationConfig,
        audience: parsedConfig.clientId
      }
    );
    const result = idTokenProfileStandardClaimsGuard.safeParse(payload);
    if (!result.success) {
      throw new ConnectorError2(ConnectorErrorCodes2.SocialIdTokenInvalid, result.error);
    }
    const {
      sub: id,
      name,
      picture,
      email,
      email_verified,
      phone,
      phone_verified,
      nonce
    } = result.data;
    if (nonce) {
      assert(
        validationNonce,
        new ConnectorError2(ConnectorErrorCodes2.General, {
          message: "Cannot find `nonce` in session storage."
        })
      );
      assert(
        validationNonce === nonce,
        new ConnectorError2(ConnectorErrorCodes2.SocialIdTokenInvalid, {
          message: "ID Token validation failed due to `nonce` mismatch."
        })
      );
    }
    // d2e patch: expose upstream access/refresh tokens via globalThis.tokenMap
    // so the Logto JWT customizer can echo them as physionet_access_token /
    // physionet_refresh_token claims on the d2e access token.
    globalThis.tokenMap = globalThis.tokenMap || {};
    globalThis.refreshTokenMap = globalThis.refreshTokenMap || {};
    const __d2e_mapId = (email_verified && email) || id;
    if (accessToken) globalThis.tokenMap[__d2e_mapId] = accessToken;
    if (refreshToken) globalThis.refreshTokenMap[__d2e_mapId] = refreshToken;
    return {
      id,
      name: conditional(name),
      avatar: conditional(picture),
      email: conditional(email_verified && email),
      phone: conditional(phone_verified && phone),
      rawData: jsonGuard.parse(payload)
    };
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new ConnectorError2(ConnectorErrorCodes2.General, JSON.stringify(error.response.body));
    }
    throw error;
  }
};
var createOidcConnector = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: oidcConnectorConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig)
  };
};
var src_default = createOidcConnector;
export {
  src_default as default
};
//# sourceMappingURL=index.js.map