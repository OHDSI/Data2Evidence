import { Router } from 'oak';
import { API_BASE_PATH } from '../config/constants.ts';

const router = new Router({ prefix: API_BASE_PATH });
const routerNoPrefix = new Router();

async function serveAtlasFile(ctx: any) {
  const requestedPath = ctx.params[0] || 'index.html';
  let atlasBasePath = '/app/atlas-static';

  try {
    await Deno.stat(atlasBasePath);
  } catch {
    try {
      atlasBasePath = '/app/atlas/node_modules/atlas-cohort-builder/dist';
      await Deno.stat(atlasBasePath);
    } catch {
      atlasBasePath = '/app/atlas/dist';
    }
  }

  let filePath = `${atlasBasePath}/${requestedPath}`;

  if (requestedPath === '' || requestedPath.endsWith('/')) {
    filePath = `${atlasBasePath}/index.html`;
  }

  try {
    const fileInfo = await Deno.stat(filePath);

    if (fileInfo.isDirectory) {
      filePath = `${filePath}/index.html`;
    }

    let content = await Deno.readFile(filePath);

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

    if (ext === 'html') {
      const datasetId = Deno.env.get('ATLAS3_DEFAULT_DATASET_ID') || '1';
      const htmlContent = new TextDecoder().decode(content);
      const injectedScript = `<script>window.__DATASET_ID__ = '${datasetId}';</script>`;
      const modifiedHtml = htmlContent.includes('</head>')
        ? htmlContent.replace('</head>', `${injectedScript}\n</head>`)
        : `${injectedScript}\n${htmlContent}`;
      content = new TextEncoder().encode(modifiedHtml);
    }

    ctx.response.body = content;
  } catch (error) {
    console.error(`[Atlas] Error serving file ${filePath}:`, error);

    // SPA fallback
    try {
      const indexPath = `${atlasBasePath}/index.html`;
      let content = await Deno.readFile(indexPath);
      const datasetId = Deno.env.get('ATLAS3_DEFAULT_DATASET_ID') || '1';
      const htmlContent = new TextDecoder().decode(content);
      const injectedScript = `<script>window.__DATASET_ID__ = '${datasetId}';</script>`;
      const modifiedHtml = htmlContent.includes('</head>')
        ? htmlContent.replace('</head>', `${injectedScript}\n</head>`)
        : `${injectedScript}\n${htmlContent}`;
      content = new TextEncoder().encode(modifiedHtml);
      ctx.response.headers.set('Content-Type', 'text/html');
      ctx.response.body = content;
    } catch {
      ctx.response.status = 404;
      ctx.response.body = { error: 'File not found' };
    }
  }
}

router.get('/Atlas', serveAtlasFile);
router.get('/Atlas/(.*)', serveAtlasFile);

routerNoPrefix.get('/Atlas', serveAtlasFile);
routerNoPrefix.get('/Atlas/(.*)', serveAtlasFile);

export default router;
export { routerNoPrefix };
