import { Router } from 'oak';
import { create as createJWT, verify as verifyJWT } from 'djwt';
import { OidcService } from '../services/oidc.service.ts';
import { CookieService } from '../services/cookie.service.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { generateCodeVerifier } from '../utils/helpers.ts';
import type { StateData, AuthCookiePayload, AuthProvider } from '../types/index.ts';
import { getOidcConfig } from '../config/oidc.config.ts';
import { API_BASE_PATH } from '../config/constants.ts';

const router = new Router({ prefix: API_BASE_PATH });
const oidcService = new OidcService();
const cookieService = new CookieService();

const STATE_SECRET = Deno.env.get('STATE_SECRET') || 'change-this-state-secret';
const COOKIE_NAME = Deno.env.get('COOKIE_NAME') || 'atlas_auth';
const ATLAS3_FRONTEND_URL = Deno.env.get('ATLAS3_FRONTEND_URL') || 'http://localhost:5173';
const ATLAS3_REDIRECT_PATH = Deno.env.get('ATLAS3_REDIRECT_PATH') || '';
const PORTAL_BACKEND_URL = Deno.env.get('PORTAL_BACKEND_URL') || 'https://localhost:4000';
const IDP_SUBJECT_PROP = Deno.env.get('IDP_SUBJECT_PROP') || 'sub';
const IDP_NAME_PROP = Deno.env.get('IDP_NAME_PROP') || 'username';

const encoder = new TextEncoder();
const keyData = encoder.encode(STATE_SECRET.padEnd(32, '0').slice(0, 32));

async function getJwtKey() {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

router.get('/user/login', async (ctx) => {
  const codeVerifier = generateCodeVerifier();
  const redirect = ctx.request.url.searchParams.get('redirect') || '/';

  const stateData: StateData = {
    state: crypto.randomUUID(),
    codeVerifier,
    redirect,
    timestamp: Date.now(),
  };

  const key = await getJwtKey();
  const stateToken = await createJWT(
    { alg: 'HS256', typ: 'JWT' },
    { ...stateData, exp: Math.floor(Date.now() / 1000) + 600 },
    key
  );

  const authUrl = await oidcService.generateAuthUrl(stateToken, codeVerifier);

  ctx.response.redirect(authUrl);
});

router.post('/user/login', async (ctx) => {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();

  const body = await ctx.request.body.json().catch(() => ({}));
  const redirect = body.redirect || '/';

  const stateData: StateData = {
    state,
    codeVerifier,
    redirect,
    timestamp: Date.now(),
  };

  const key = await getJwtKey();
  const stateToken = await createJWT(
    { alg: 'HS256', typ: 'JWT' },
    { ...stateData, exp: Math.floor(Date.now() / 1000) + 600 },
    key
  );

  const authUrl = await oidcService.generateAuthUrl(state, codeVerifier);

  ctx.response.body = {
    redirect: `${authUrl}&state_token=${stateToken}`,
    message: 'Redirecting to authentication provider',
  };
});

router.get('/auth/callback', async (ctx) => {
  try {
    const code = ctx.request.url.searchParams.get('code');
    const state = ctx.request.url.searchParams.get('state');

    if (!code || !state) {
      ctx.response.status = 400;
      ctx.response.body = 'Missing required parameters';
      return;
    }

    const key = await getJwtKey();
    let stateData: StateData;

    try {
      const payload = await verifyJWT(state, key);
      stateData = payload as unknown as StateData;
    } catch (error) {
      console.error('[Auth] State token verification failed:', error);
      ctx.response.status = 400;
      ctx.response.body = 'Invalid or expired state token';
      return;
    }

    const tokens = await oidcService.handleCallback(code, state, stateData.codeVerifier);

    let userInfo;
    try {
      const idTokenParts = tokens.id_token?.split('.');
      if (idTokenParts && idTokenParts.length === 3) {
        const payload = JSON.parse(atob(idTokenParts[1]));
        const userId = payload[IDP_SUBJECT_PROP] || payload.sub;
        const username = payload[IDP_NAME_PROP] || payload.email || payload.preferred_username || payload.username || userId;
        const displayName = payload.name || username;

        userInfo = {
          sub: userId,
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          displayName: displayName,
          login: username,
          username: username,
        };
      } else {
        throw new Error('Invalid ID token format');
      }
    } catch (error) {
      console.error('[Auth Callback] Failed to decode ID token, falling back to userinfo:', error);
      userInfo = await oidcService.getUserInfo(tokens.access_token);
    }

    const webapiToken = tokens.access_token;

    const cookiePayload: AuthCookiePayload = {
      ...tokens,
      user_info: userInfo,
      webapi_token: webapiToken,
    };

    const encryptedCookie = await cookieService.createAuthCookie(cookiePayload);
    
    const cookieDomain = Deno.env.get('COOKIE_DOMAIN');
    const cookieOptions: any = {
      httpOnly: true,
      secure: Deno.env.get('COOKIE_SECURE') === 'true',
      sameSite: 'lax',
      maxAge: Number(Deno.env.get('COOKIE_MAX_AGE')) || 86400,
      path: '/',
    };

    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
    }

    await ctx.cookies.set(COOKIE_NAME, encryptedCookie, cookieOptions);

    const client = 'OpenID';
    const redirectUrl = stateData.redirect || '';

    let callbackUrl = `${ATLAS3_FRONTEND_URL}${ATLAS3_REDIRECT_PATH}/${client}`;
    if (webapiToken) {
      callbackUrl += `/${webapiToken}`;
      if (redirectUrl && redirectUrl !== '/') {
        callbackUrl += `/${encodeURIComponent(redirectUrl)}`;
      }
    }

    console.log('[Auth Callback] Redirecting to Atlas');
    ctx.response.redirect(callbackUrl);
    
  } catch (error) {
    console.error('[Auth Callback] Error:', error);
    ctx.response.status = 500;
    ctx.response.body = 'Authentication failed';
  }
});

router.get('/user/me', authMiddleware, async (ctx) => {
  try {
    const tokens = ctx.state.authTokens as AuthCookiePayload;
    
    if (tokens.user_info) {
      ctx.response.body = tokens.user_info;
      return;
    }
    
    const response = await fetch(`${PORTAL_BACKEND_URL}/gateway/api/user/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user info from backend');
    }
    
    ctx.response.body = await response.json();
    
  } catch (error) {
    console.error('[User Info] Error:', error);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Failed to get user info' };
  }
});

router.get('/user/refresh', authMiddleware, (ctx) => {
  ctx.response.body = {
    success: true,
    message: 'Token is valid',
  };
});

async function handleLogout(ctx: any) {
  const authCookie = await ctx.cookies.get(COOKIE_NAME);
  let idToken = null;

  if (authCookie) {
    const tokens = await cookieService.parseAuthCookie(authCookie);
    idToken = tokens?.id_token;
  }

  const cookieDomain = Deno.env.get('COOKIE_DOMAIN');
  const deleteOptions: any = {
    path: '/',
  };

  if (cookieDomain) {
    deleteOptions.domain = cookieDomain;
  }

  await ctx.cookies.delete(COOKIE_NAME, deleteOptions);

  const config = getOidcConfig();
  const params = new URLSearchParams();

  if (idToken) {
    params.append('id_token_hint', idToken);
  }

  const postLogoutRedirectUri = Deno.env.get('OIDC_POST_LOGOUT_REDIRECT_URI');

  if (postLogoutRedirectUri) {
    params.append('post_logout_redirect_uri', postLogoutRedirectUri);
  }

  const logoutUrl = `${config.endSessionEndpoint}?${params.toString()}`;

  ctx.response.body = {
    redirect: logoutUrl,
    message: 'Logged out successfully',
  };
}

router.get('/user/logout', handleLogout);
router.post('/user/logout', handleLogout);

router.get('/user/oauth/openid', async (ctx) => {
  const codeVerifier = generateCodeVerifier();
  const redirect = ctx.request.url.searchParams.get('redirect') || '/';

  const stateData: StateData = {
    state: crypto.randomUUID(),
    codeVerifier,
    redirect,
    timestamp: Date.now(),
  };

  const key = await getJwtKey();
  const stateToken = await createJWT(
    { alg: 'HS256', typ: 'JWT' },
    { ...stateData, exp: Math.floor(Date.now() / 1000) + 600 },
    key
  );

  const authUrl = await oidcService.generateAuthUrl(stateToken, codeVerifier);

  ctx.response.redirect(authUrl);
});

router.get('/user/oauth/providers', (ctx) => {
  const providers: AuthProvider[] = [
    {
      name: 'Data2Evidence Login',
      url: 'user/oauth/openid',
      ajax: false,
      icon: 'mdi-shield-account',
      isUseCredentialsForm: false,
    },
  ];

  ctx.response.body = providers;
});

export default router;
