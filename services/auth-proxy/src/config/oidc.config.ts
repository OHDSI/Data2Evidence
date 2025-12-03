import type { OidcConfig } from '../types/index.ts';

let oidcConfig: OidcConfig | null = null;

export function getOidcConfig(): OidcConfig {
  if (!oidcConfig) {
    throw new Error('OIDC configuration not initialized');
  }
  return oidcConfig;
}

export function initializeOidcClient(): void {
  const clientId = Deno.env.get('OIDC_CLIENT_ID');
  const issuer = Deno.env.get('OIDC_ISSUER');
  const authorizationEndpoint = Deno.env.get('OIDC_AUTHORIZATION_ENDPOINT');
  const tokenEndpoint = Deno.env.get('OIDC_TOKEN_ENDPOINT');
  const userInfoEndpoint = Deno.env.get('OIDC_USERINFO_ENDPOINT');
  const endSessionEndpoint = Deno.env.get('OIDC_END_SESSION_ENDPOINT');
  const redirectUri = Deno.env.get('OIDC_REDIRECT_URI');
  const scope = Deno.env.get('OIDC_SCOPE');

  if (!clientId || !issuer || !authorizationEndpoint || !tokenEndpoint || 
      !userInfoEndpoint || !endSessionEndpoint || !redirectUri || !scope) {
    throw new Error('Missing required OIDC environment variables');
  }

  oidcConfig = {
    clientId,
    clientSecret: Deno.env.get('OIDC_CLIENT_SECRET'),
    issuer,
    authorizationEndpoint,
    tokenEndpoint,
    userInfoEndpoint,
    endSessionEndpoint,
    redirectUri,
    scope,
  };

  console.log('[OIDC] Configuration initialized');
}
