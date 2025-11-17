import type { Context } from 'oak';

const ATLAS3_FRONTEND_URL = Deno.env.get('ATLAS3_FRONTEND_URL') || 'http://localhost:5173';

export async function corsMiddleware(ctx: Context, next: () => Promise<unknown>) {
  ctx.response.headers.set('Access-Control-Allow-Origin', ATLAS3_FRONTEND_URL);
  ctx.response.headers.set('Access-Control-Allow-Credentials', 'true');
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie'
  );
  
  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204;
    return;
  }
  
  await next();
}
