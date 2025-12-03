import type { Context } from 'oak';
import { CookieService } from '../services/cookie.service.ts';
import { API_BASE_PATH } from '../config/constants.ts';

const cookieService = new CookieService();
const PORTAL_BACKEND_URL = Deno.env.get('PORTAL_BACKEND_URL') || 'https://localhost:4000';
const PORTAL_BACKEND_PATH = Deno.env.get('PORTAL_BACKEND_PATH') || '/gateway/api';
const COOKIE_NAME = Deno.env.get('COOKIE_NAME') || 'atlas_auth';
const PROXY_BASE_REGEX = new RegExp(`^${API_BASE_PATH}`, 'i');

export async function proxyMiddleware(ctx: Context) {
  const authCookie = await ctx.cookies.get(COOKIE_NAME);

  if (!authCookie) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Not authenticated' };
    return;
  }
  
  let authTokens;
  try {
    authTokens = await cookieService.parseAuthCookie(authCookie);
  } catch (error) {
    console.error('[Proxy] Cookie parse error');
    ctx.response.status = 401;
    ctx.response.body = { error: 'Cookie parse error' };
    return;
  }

  if (!authTokens || !authTokens.access_token) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Invalid authentication' };
    return;
  }
  
  const pathWithoutBase = ctx.request.url.pathname.replace(PROXY_BASE_REGEX, '');
  const normalizedPath = pathWithoutBase
    ? pathWithoutBase.startsWith('/')
      ? pathWithoutBase
      : `/${pathWithoutBase}`
    : '';
  const targetUrl = `${PORTAL_BACKEND_URL}${PORTAL_BACKEND_PATH}${normalizedPath}${ctx.request.url.search}`;
  
  console.log(`[Proxy] ${ctx.request.method} ${targetUrl}`);
  
  const headers = new Headers();
  const token = authTokens.webapi_token || authTokens.access_token;
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  // Use x-source-key from frontend (sourced from Atlas3's localStorage selectedVocabulary)
  // Falls back to env var default if header not provided
  const sourceKey = ctx.request.headers.get('x-source-key')
    || Deno.env.get('ATLAS3_DEFAULT_SOURCE_KEY')
    || 'SYNPUF1K';
  headers.set('datasetId', sourceKey);
  
  ctx.request.headers.forEach((value: string, key: string) => {
    if (key.toLowerCase() !== 'host' && 
        key.toLowerCase() !== 'cookie' &&
        key.toLowerCase() !== 'authorization') {
      headers.set(key, value);
    }
  });
  
  try {
    let body = undefined;
    if (ctx.request.hasBody) {
      const bodyData = await ctx.request.body.json();
      body = JSON.stringify(bodyData);
    }
    
    const response = await fetch(targetUrl, {
      method: ctx.request.method,
      headers,
      body,
    });

    console.log(`[Proxy] Response: ${response.status}`);

    ctx.response.status = response.status;
    
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') {
        ctx.response.headers.set(key, value);
      }
    });
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      ctx.response.body = await response.json();
    } else {
      ctx.response.body = await response.text();
    }
  } catch (error) {
    console.error('[Proxy] Error:', error);
    ctx.response.status = 502;
    ctx.response.body = {
      error: 'Bad Gateway',
      message: 'Failed to proxy request to backend',
    };
  }
}
