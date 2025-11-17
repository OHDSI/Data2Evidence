import { getOidcConfig } from '../config/oidc.config.ts';
import type { TokenSet, UserInfo } from '../types/index.ts';

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  const base64 = btoa(String.fromCharCode(...hashArray));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export class OidcService {
  async generateAuthUrl(state: string, codeVerifier: string): Promise<string> {
    const config = getOidcConfig();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    console.log('[OIDC] Generating auth URL with scope:', config.scope);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${config.authorizationEndpoint}?${params.toString()}`;
  }
  
  async handleCallback(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<TokenSet> {
    const config = getOidcConfig();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: codeVerifier,
      resource: 'https://alp-default',
    });

    if (config.clientSecret) {
      body.append('client_secret', config.clientSecret);
    }

    console.log('[OIDC] Token request with resource: https://alp-default');

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OIDC] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
      token_type: tokens.token_type,
    };
  }
  
  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const config = getOidcConfig();
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    });
    
    if (config.clientSecret) {
      body.append('client_secret', config.clientSecret);
    }
    
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const tokens = await response.json();
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
      token_type: tokens.token_type,
    };
  }
  
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const config = getOidcConfig();
    
    const response = await fetch(config.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    
    return await response.json() as UserInfo;
  }
  
  isTokenExpired(expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const buffer = 5 * 60; // 5 minutes
    return now >= (expiresAt - buffer);
  }
}
