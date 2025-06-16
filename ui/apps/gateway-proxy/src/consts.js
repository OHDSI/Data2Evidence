export const baseUrl = window.location.origin;
export const redirectUrl = `${baseUrl}/ui/gateway/dashboard`;
export const postRedirectUrl = `${baseUrl}/ui/gateway/dashboard/home`;
export const appId = process.env.LOGTO__ALP_APP__CLIENT_ID || ''; // Logto app id
export const appSecret = process.env.LOGTO__ALP_APP__CLIENT_SECRET || ''; // Logto app secret
export const endpoint = process.env.CADDY__ALP__PUBLIC_FQDN ? `https://${process.env.CADDY__ALP__PUBLIC_FQDN}` : 'https://localhost:41100'; // D2E URL for Logto
export const resourceScopes = ['openid', 'profile', 'email', 'offline_access'];