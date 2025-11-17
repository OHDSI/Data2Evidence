import { Application } from 'oak';
import { initializeOidcClient } from './config/oidc.config.ts';
import { corsMiddleware } from './middleware/cors.middleware.ts';
import { loggingMiddleware } from './middleware/logging.middleware.ts';
import { proxyMiddleware } from './middleware/proxy.middleware.ts';
import authRoutes from './routes/auth.routes.ts';
import healthRoutes from './routes/health.routes.ts';
import atlasRoutes, { routerNoPrefix as atlasRoutesNoPrefix } from './routes/atlas.routes.ts';
import managementRoutes from './routes/management.routes.ts';
import pluginRoutes from './routes/plugin.routes.ts';
import resourcesRoutes from './routes/resources.routes.ts';
import { API_BASE_PATH } from './config/constants.ts';

// Load .env file if it exists
try {
  const envFile = await Deno.readTextFile('.env');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        const value = valueParts.join('=');
        Deno.env.set(key.trim(), value.trim());
      }
    }
  });
} catch {
  console.log('[Server] No .env file found, using environment variables');
}

const PORT = Number(Deno.env.get('PORT')) || 3001;
const app = new Application({
  proxy: true, // Trust proxy headers (X-Forwarded-Proto, etc.)
});
const PROXY_PATH_REGEX = new RegExp(`^${API_BASE_PATH}(?:/|$)`, 'i');

try {
  initializeOidcClient();
  console.log('[Server] OIDC client initialized');
} catch (error) {
  console.error('[Server] Failed to initialize OIDC client:', error);
  Deno.exit(1);
}

app.use(corsMiddleware);
app.use(loggingMiddleware);

app.use(healthRoutes.routes());
app.use(healthRoutes.allowedMethods());

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(managementRoutes.routes());
app.use(managementRoutes.allowedMethods());

app.use(resourcesRoutes.routes());
app.use(resourcesRoutes.allowedMethods());

app.use(pluginRoutes.routes());
app.use(pluginRoutes.allowedMethods());

app.use(atlasRoutes.routes());
app.use(atlasRoutes.allowedMethods());

app.use(atlasRoutesNoPrefix.routes());
app.use(atlasRoutesNoPrefix.allowedMethods());

app.use(async (ctx) => {
  if (PROXY_PATH_REGEX.test(ctx.request.url.pathname)) {
    await proxyMiddleware(ctx);
    return;
  }

  ctx.response.status = 404;
  ctx.response.body = { error: 'Not found' };
});

app.addEventListener('listen', ({ hostname, port, secure }) => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Atlas3 Stateless Authentication Proxy           ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on ${secure ? 'https' : 'http'}://${hostname || 'localhost'}:${port}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   POST   ${API_BASE_PATH}/user/login                    - Initiate OIDC login`);
  console.log(`   GET    ${API_BASE_PATH}/auth/callback                 - OIDC callback handler`);
  console.log(`   GET    ${API_BASE_PATH}/user/me                       - Get user information`);
  console.log(`   GET    ${API_BASE_PATH}/user/refresh                  - Refresh token`);
  console.log(`   POST   ${API_BASE_PATH}/user/logout                   - Logout`);
  console.log(`   GET    ${API_BASE_PATH}/user/oauth/providers          - Get OAuth providers`);
  console.log(`   GET    ${API_BASE_PATH}/health                        - Health check`);
  console.log(`   GET    ${API_BASE_PATH}/auth-management/config        - Get auth config`);
  console.log(`   GET    ${API_BASE_PATH}/auth-management/sessions/stats - Session statistics`);
  console.log(`   GET    ${API_BASE_PATH}/Atlas                         - Atlas UI`);
  console.log(`   GET    /Atlas                                         - Atlas UI (no prefix)`);
  console.log(`   GET    /Atlas/config/plugins.json                     - Plugin manifest`);
  console.log(`   GET    /Atlas/plugins/*                               - Plugin files`);
  console.log(`   GET    /mri/*                                         - Vue MRI assets (proxied to Portal)`);
  console.log(`   *      ${API_BASE_PATH}/*                             - Proxy to Portal backend`);
  console.log('');
  console.log('✅ Stateless: No Redis required!');
  console.log('✅ Encrypted cookies for session storage');
  console.log('✅ Automatic token refresh');
  console.log('');
});

app.addEventListener('error', (event) => {
  console.error('[Server] Unhandled error:', event.error);
});

const USE_HTTPS = Deno.env.get('USE_HTTPS') === 'true';
const TLS_CERT = Deno.env.get('TLS_CERT');
const TLS_KEY = Deno.env.get('TLS_KEY');

console.log(`[Server] Starting on port ${PORT}... (HTTPS: ${USE_HTTPS})`);

if (USE_HTTPS && TLS_CERT && TLS_KEY) {
  console.log('[Server] Using HTTPS with provided certificates');
  await app.listen({
    port: PORT,
    secure: true,
    cert: TLS_CERT,
    key: TLS_KEY,
  });
} else {
  if (USE_HTTPS) {
    console.warn('[Server] HTTPS requested but certificates not provided, falling back to HTTP');
  }
  await app.listen({ port: PORT });
}
