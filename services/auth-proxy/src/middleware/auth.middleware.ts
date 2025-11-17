import type { Context } from 'oak';
import { CookieService } from '../services/cookie.service.ts';
import { OidcService } from '../services/oidc.service.ts';
import type { AuthCookiePayload } from '../types/index.ts';

const cookieService = new CookieService();
const oidcService = new OidcService();

const COOKIE_NAME = Deno.env.get('COOKIE_NAME') || 'atlas_auth';

export async function authMiddleware(ctx: Context, next: () => Promise<unknown>) {
  const authCookie = await ctx.cookies.get(COOKIE_NAME);
  
  if (!authCookie) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Not authenticated' };
    return;
  }
  
  let authTokens = await cookieService.parseAuthCookie(authCookie);
  
  if (!authTokens) {
    await ctx.cookies.delete(COOKIE_NAME);
    ctx.response.status = 401;
    ctx.response.body = { error: 'Invalid authentication' };
    return;
  }
  
  if (cookieService.isExpired(authTokens)) {
    if (authTokens.refresh_token) {
      try {
        console.log('[Auth] Refreshing expired token');
        const newTokens = await oidcService.refreshToken(authTokens.refresh_token);
        
        authTokens = {
          ...newTokens,
          user_info: authTokens.user_info,
        };
        
        const encryptedCookie = await cookieService.createAuthCookie(authTokens);
        
        await ctx.cookies.set(COOKIE_NAME, encryptedCookie, {
          httpOnly: true,
          secure: Deno.env.get('COOKIE_SECURE') === 'true',
          sameSite: 'lax',
          maxAge: Number(Deno.env.get('COOKIE_MAX_AGE')) || 86400,
        });
        
        console.log('[Auth] Token refreshed successfully');
      } catch (error) {
        console.error('[Auth] Token refresh failed:', error);
        await ctx.cookies.delete(COOKIE_NAME);
        ctx.response.status = 401;
        ctx.response.body = { error: 'Session expired, please login' };
        return;
      }
    } else {
      await ctx.cookies.delete(COOKIE_NAME);
      ctx.response.status = 401;
      ctx.response.body = { error: 'Session expired, please login' };
      return;
    }
  }
  
  ctx.state.authTokens = authTokens;
  
  await next();
}
