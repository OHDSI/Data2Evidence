import type { Context } from 'oak';

const LOG_LEVEL = Deno.env.get('LOG_LEVEL') || 'info';

function shouldLog(level: string): boolean {
  const levels = ['debug', 'info', 'warn', 'error'];
  const configLevel = levels.indexOf(LOG_LEVEL);
  const messageLevel = levels.indexOf(level);
  return messageLevel >= configLevel;
}

export async function loggingMiddleware(ctx: Context, next: () => Promise<unknown>) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  
  if (shouldLog('info')) {
    console.log(`[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname}`);
  }
  
  try {
    await next();
    
    const duration = Date.now() - start;
    
    if (shouldLog('info')) {
      console.log(
        `[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} (${duration}ms)`
      );
    }
  } catch (error) {
    const duration = Date.now() - start;
    
    console.error(
      `[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname} - ERROR (${duration}ms)`,
      error
    );
    
    ctx.response.status = 500;
    ctx.response.body = {
      error: 'Internal server error',
      requestId,
    };
  }
}
