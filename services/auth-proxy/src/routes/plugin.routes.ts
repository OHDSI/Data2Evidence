import { Router } from 'oak';

const atlasRouter = new Router({ prefix: '/Atlas' });
const PORTAL_BACKEND_URL = Deno.env.get('PORTAL_BACKEND_URL') || 'https://localhost:41100';

async function serveStaticFile(ctx: any, basePath: string, requestedPath: string) {
  let filePath = `${basePath}/${requestedPath}`;

  if (requestedPath === '' || requestedPath.endsWith('/')) {
    filePath = `${basePath}/index.html`;
  }

  try {
    const fileInfo = await Deno.stat(filePath);

    if (fileInfo.isDirectory) {
      filePath = `${filePath}/index.html`;
    }

    const content = await Deno.readFile(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
    };

    ctx.response.headers.set('Content-Type', contentTypes[ext || ''] || 'application/octet-stream');
    ctx.response.body = content;
  } catch (error) {
    console.error(`[Static] Error serving file ${filePath}:`, error);
    ctx.response.status = 404;
    ctx.response.body = { error: 'File not found' };
  }
}

atlasRouter.get('/config/plugins.json', async (ctx) => {
  const staticPath = './static';
  await serveStaticFile(ctx, staticPath, 'plugins.json');
});

atlasRouter.get('/config/:filename', async (ctx) => {
  const filename = ctx.params.filename;
  const staticPath = './static';
  await serveStaticFile(ctx, staticPath, filename);
});

// Proxy webpack chunks to backend
atlasRouter.get('/plugins/cohorts/js/:filename', async (ctx) => {
  const filename = ctx.params.filename;
  const targetUrl = `${PORTAL_BACKEND_URL}/mri/js/${filename}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        ...(ctx.request.headers.get('Authorization') && {
          Authorization: ctx.request.headers.get('Authorization')!,
        }),
      },
    });

    for (const [key, value] of response.headers.entries()) {
      ctx.response.headers.set(key, value);
    }

    ctx.response.status = response.status;
    ctx.response.body = response.body;
  } catch (error) {
    console.error(`[Plugin] Error proxying ${filename}:`, error);
    ctx.response.status = 502;
    ctx.response.body = { error: 'Failed to fetch from backend' };
  }
});

atlasRouter.get('/plugins/:pluginId/(.*)', async (ctx) => {
  const pluginId = ctx.params.pluginId;
  const filePath = ctx.params[0] || 'index.js';
  const staticPath = './static/plugins';
  await serveStaticFile(ctx, staticPath, `${pluginId}/${filePath}`);
});

export default atlasRouter;
