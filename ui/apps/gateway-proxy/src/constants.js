export const API_BASE_PREFIX = '/d2e';

export const baseUrl = window.location.origin;
export const redirectUrl = `${baseUrl}${API_BASE_PREFIX}/ui/gateway/dashboard`;
export const postRedirectUrl = `${baseUrl}${API_BASE_PREFIX}/ui/gateway/dashboard`;
const oidcConfig = JSON.parse(window.ENV_DATA.REACT_APP_IDP_OIDC_CONFIG) || {client_id: ''};
export const appId = oidcConfig.client_id || '';
export const endpoint = baseUrl;
export const resourceScopes = ['openid', 'profile', 'email', 'offline_access'];

