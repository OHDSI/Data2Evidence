#!/usr/bin/env node
/**
 * Postinstall script for Atlas Lite plugin
 *
 * Copies the @data2evidence/d2e-atlas tarball contents into resources/atlas.
 * d2e-atlas is served as-is: index.html boots RequireJS via `data-main="js/main"`
 * and modules are loaded lazily from /atlas/js/* at runtime, so no build step
 * is required. The included node_modules/ is served alongside because the page
 * loads bowser/knockout/etc. from there directly.
 */

import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const resourcesDir = join(rootDir, 'resources', 'atlas');
const atlasDir = join(rootDir, 'node_modules', '@data2evidence', 'd2e-atlas');

console.log('[postinstall] Setting up Atlas Lite plugin resources...');

if (!existsSync(atlasDir)) {
  console.error('[postinstall] ERROR: @data2evidence/d2e-atlas not found at', atlasDir);
  process.exit(1);
}

// Reset resources/atlas so a previous Atlas 3.0 build doesn't bleed through.
rmSync(resourcesDir, { recursive: true, force: true });
mkdirSync(resourcesDir, { recursive: true });

// Copy the static assets that index.html references at runtime.
console.log('[postinstall] Copying d2e-atlas assets to resources/atlas...');
for (const entry of ['index.html', 'js', 'images', 'node_modules']) {
  const src = join(atlasDir, entry);
  if (!existsSync(src)) {
    console.error(`[postinstall] ERROR: expected ${src} in @data2evidence/d2e-atlas`);
    process.exit(1);
  }
  cpSync(src, join(resourcesDir, entry), { recursive: true });
}

// Portal resources directory (for portal plugin wrapper).
const portalDir = join(rootDir, 'resources', 'portal');
mkdirSync(portalDir, { recursive: true });

console.log('[postinstall] Atlas Lite plugin setup complete!');
