import { Router } from 'oak';

const router = new Router();
const PORTAL_BACKEND_URL = Deno.env.get('PORTAL_BACKEND_URL') || 'https://localhost:41100';

// Proxy /mri/* to Portal backend
// Vue MRI assets are served directly at /mri/* by the Portal backend
router.get('/mri/:path(.*)', async (ctx) => {
  const path = ctx.params.path;
  const targetUrl = `${PORTAL_BACKEND_URL}/mri/${path}`;

  try {
    console.log(`[MRI] Proxying: /mri/${path} → ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        // Forward auth header if present
        ...(ctx.request.headers.get('Authorization') && {
          Authorization: ctx.request.headers.get('Authorization')!,
        }),
      },
    });

    // Copy response headers
    for (const [key, value] of response.headers.entries()) {
      ctx.response.headers.set(key, value);
    }

    ctx.response.status = response.status;
    ctx.response.body = response.body;
  } catch (error) {
    console.error(`[MRI] Error proxying /mri/${path}:`, error);
    ctx.response.status = 502;
    ctx.response.body = { error: 'Failed to fetch MRI resource from backend' };
  }
});

// Proxy /ui/* to Portal backend
// SAP UI5 and other UI resources
router.get('/ui/:path(.*)', async (ctx) => {
  const path = ctx.params.path;
  const targetUrl = `${PORTAL_BACKEND_URL}/ui/${path}`;

  try {
    console.log(`[UI] Proxying: /ui/${path} → ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        // Forward auth header if present
        ...(ctx.request.headers.get('Authorization') && {
          Authorization: ctx.request.headers.get('Authorization')!,
        }),
      },
    });

    // Copy response headers
    for (const [key, value] of response.headers.entries()) {
      ctx.response.headers.set(key, value);
    }

    ctx.response.status = response.status;
    ctx.response.body = response.body;
  } catch (error) {
    console.error(`[UI] Error proxying /ui/${path}:`, error);
    ctx.response.status = 502;
    ctx.response.body = { error: 'Failed to fetch UI resource from backend' };
  }
});

// Proxy /resources/* to Portal backend
// Serves notebook-ui, analysis-ui, and other single-spa micro-frontends
router.get('/resources/:path(.*)', async (ctx) => {
  const path = ctx.params.path;
  const targetUrl = `${PORTAL_BACKEND_URL}/resources/${path}`;

  try {
    console.log(`[Resources] Proxying: /resources/${path} → ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        // Forward auth header if present
        ...(ctx.request.headers.get('Authorization') && {
          Authorization: ctx.request.headers.get('Authorization')!,
        }),
      },
    });

    // Copy response headers
    for (const [key, value] of response.headers.entries()) {
      ctx.response.headers.set(key, value);
    }

    ctx.response.status = response.status;
    ctx.response.body = response.body;
  } catch (error) {
    console.error(`[Resources] Error proxying /resources/${path}:`, error);
    ctx.response.status = 502;
    ctx.response.body = { error: 'Failed to fetch resource from backend' };
  }
});

export default router;
