import { Router } from 'oak';
import { API_BASE_PATH } from '../config/constants.ts';

const router = new Router({ prefix: API_BASE_PATH });
const routerNoPrefix = new Router(); // For /Atlas without /WebAPI prefix

// Helper function to serve Atlas files
async function serveAtlasFile(ctx: any) {
  const requestedPath = ctx.params[0] || 'index.html';

  // Try to find Atlas dist directory - check volume mount first, then npm packages
  let atlasBasePath = '/app/atlas-static';

  // Check if it exists, otherwise try alternative paths
  try {
    await Deno.stat(atlasBasePath);
  } catch {
    // Try npm package locations
    try {
      atlasBasePath = '/app/atlas/node_modules/atlas3/dist';
      await Deno.stat(atlasBasePath);
    } catch {
      try {
        atlasBasePath = '/app/atlas/node_modules/@p-hoffmann/atlas/dist';
        await Deno.stat(atlasBasePath);
      } catch {
        atlasBasePath = '/app/atlas/dist';
      }
    }
  }

  // Default to index.html for directory requests
  let filePath = `${atlasBasePath}/${requestedPath}`;

  if (requestedPath === '' || requestedPath.endsWith('/')) {
    filePath = `${atlasBasePath}/index.html`;
  }

  try {
    const fileInfo = await Deno.stat(filePath);

    if (fileInfo.isDirectory) {
      filePath = `${filePath}/index.html`;
    }

    const content = await Deno.readFile(filePath);

    // Set appropriate content type based on file extension
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
    console.error(`[Atlas] Error serving file ${filePath}:`, error);

    // Try to serve index.html as fallback for SPA routing
    try {
      const indexPath = `${atlasBasePath}/index.html`;
      const content = await Deno.readFile(indexPath);
      ctx.response.headers.set('Content-Type', 'text/html');
      ctx.response.body = content;
    } catch {
      ctx.response.status = 404;
      ctx.response.body = { error: 'File not found' };
    }
  }
}

// Register routes with /WebAPI prefix
router.get('/Atlas', serveAtlasFile);
router.get('/Atlas/(.*)', serveAtlasFile);

// Register routes without /WebAPI prefix (for Caddy routing)
routerNoPrefix.get('/Atlas', serveAtlasFile);
routerNoPrefix.get('/Atlas/(.*)', serveAtlasFile);

export default router;
export { routerNoPrefix };
