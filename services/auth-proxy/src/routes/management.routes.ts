import { Router } from 'oak';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { API_BASE_PATH } from '../config/constants.ts';
import { getOidcConfig } from '../config/oidc.config.ts';

const router = new Router({ prefix: `${API_BASE_PATH}/auth-management` });

// Get current OIDC configuration (public info only, no secrets)
router.get('/config', authMiddleware, (ctx) => {
  const config = getOidcConfig();

  ctx.response.body = {
    issuer: config.issuer,
    clientId: config.clientId,
    scopes: config.scope.split(' '),
    redirectUri: config.redirectUri,
  };
});

// Get active sessions statistics
router.get('/sessions/stats', authMiddleware, (ctx) => {
  // Since we're using stateless encrypted cookies, we can only report
  // that the current user is authenticated (can't track other sessions)
  ctx.response.body = {
    activeUsers: 1, // Current authenticated user
    timestamp: new Date().toISOString(),
  };
});

export default router;
