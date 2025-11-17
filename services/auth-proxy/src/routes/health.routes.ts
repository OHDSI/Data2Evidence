import { Router } from 'oak';
import { API_BASE_PATH } from '../config/constants.ts';

const router = new Router({ prefix: API_BASE_PATH });

router.get('/health', (ctx) => {
  ctx.response.body = {
    status: 'ok',
    service: 'atlas3-auth-proxy',
    stateless: true,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  };
});

export default router;
