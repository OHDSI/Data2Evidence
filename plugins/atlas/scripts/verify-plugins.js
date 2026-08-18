#!/usr/bin/env node
/**
 * Prepack guard: every plugin registered in the served plugins.json must have its
 * entryPoint present under resources/atlas/plugins.
 *
 * The Atlas3 shell reads config/plugins.json to build its menu, then SystemJS-imports
 * each entryPoint on navigation. A registered plugin whose bundle was never staged
 * therefore ships a menu item that 404s at click time ("SystemJS Error#3"), which is
 * invisible until someone opens it. Most plugins are staged by postinstall from a
 * node_modules dist; patient-analytics is built out of the UI monorepo and staged by
 * the caller (scripts/build-atlas.sh, and the atlas job in docker-build-push.yaml),
 * so it is the one that can silently go missing.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(rootDir, 'resources', 'atlas', 'plugins');
const configPath = join(rootDir, 'resources', 'atlas', 'config', 'plugins.json');

if (!existsSync(configPath)) {
  console.error('[verify-plugins] ERROR: no config at', configPath, '- run npm install first.');
  process.exit(1);
}

const { plugins = [] } = JSON.parse(readFileSync(configPath, 'utf8'));
const missing = plugins.filter(p => p.entryPoint && !existsSync(join(pluginsDir, p.entryPoint)));

for (const p of plugins) {
  const ok = !missing.includes(p);
  console.log(`[verify-plugins] ${ok ? 'OK  ' : 'MISS'} ${p.id} -> plugins/${p.entryPoint}`);
}

if (missing.length) {
  console.error(
    `[verify-plugins] ERROR: ${missing.length} registered plugin(s) have no bundle: ` +
      missing.map(p => p.id).join(', ')
  );
  console.error('[verify-plugins] They would appear in the Atlas menu and fail to load at runtime.');
  console.error('[verify-plugins] Build them (scripts/build-atlas.sh) or drop them from plugins.standalone.json.');
  process.exit(1);
}

console.log(`[verify-plugins] All ${plugins.length} registered plugins have a bundle.`);
