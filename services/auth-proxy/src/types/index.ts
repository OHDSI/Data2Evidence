export interface AuthCookiePayload {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_at: number;
  user_info?: UserInfo;
  webapi_token?: string;
}

export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  expires_at: number;
  token_type?: string;
}

export interface OidcConfig {
  clientId: string;
  clientSecret?: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  endSessionEndpoint: string;
  redirectUri: string;
  scope: string;
}

export interface StateData {
  state: string;
  codeVerifier: string;
  redirect: string;
  timestamp: number;
}

export interface AuthProvider {
  name: string;
  url: string;
  ajax: boolean;
  icon: string;
  isUseCredentialsForm?: boolean;
}
