export const baseUrl = window.location.origin;
export const redirectUrl = `${baseUrl}/ui/gateway/dashboard`;
export const postRedirectUrl = `${baseUrl}/ui/gateway/dashboard/home`; // The URL to redirect to after sign-in, can be the same as redirectUrl

// TODO: use ENV
export const appId = 'PmBVWS6qrqKztMi0PfExm'; // Register the sample app in Logto dashboard and replace with your own app id
export const appSecret = 'leCA6CuhZEJHaSG9LrEb5o0Zq6oxCK'; // Register the sample app in Logto dashboard and replace with your own app secret
export const endpoint = 'https://localhost:41100'; // Replace with your own Logto endpoint
export const resourceIndicators = ['https://localhost:3001/api/test']; // Replace with your own resource indicators registered in Logto dashboard
export const resourceScopes = ['openid', 'profile', 'email', 'offline_access']; // Replace with your own resource scopes registered with the resource indicators in Logto dashboard