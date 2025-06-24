export const baseUrl = window.location.origin;
export const redirectUrl = `${baseUrl}/ui/gateway/dashboard`;
export const postRedirectUrl = `${baseUrl}/ui/gateway/dashboard/home`;
const oidcConfig = JSON.parse(window.ENV_DATA.REACT_APP_IDP_OIDC_CONFIG) || {client_id: ''};
export const appId = oidcConfig.client_id || ''; // Logto app id
export const endpoint = baseUrl; // D2E URL for Logto
export const resourceScopes = ['openid', 'profile', 'email', 'offline_access'];