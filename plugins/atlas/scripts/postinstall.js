#!/usr/bin/env node
/**
 * Postinstall for the Atlas3 plugin: copy the prebuilt @ohdsi/atlas3 dist into
 * resources/atlas, overlay d2e runtime config (config-local.json, plugins.json),
 * and apply d2e branding. Served as-is at /atlas; no Atlas3 source changes.
 */

import { cpSync, mkdirSync, rmSync, existsSync, copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const resourcesDir = join(rootDir, 'resources', 'atlas');
const atlasDistDir = join(rootDir, 'node_modules', '@ohdsi', 'atlas3', 'dist');

console.log('[postinstall] Setting up Atlas3 plugin resources...');

if (!existsSync(atlasDistDir)) {
  console.error('[postinstall] ERROR: @ohdsi/atlas3 dist not found at', atlasDistDir);
  console.error('[postinstall] Did the GitHub Packages install succeed? Ensure GITHUB_TOKEN is set (see .npmrc).');
  process.exit(1);
}

// Reset resources/atlas so a previous Atlas build doesn't bleed through.
rmSync(resourcesDir, { recursive: true, force: true });
mkdirSync(resourcesDir, { recursive: true });

// Copy the entire prebuilt Atlas3 dist (index.html, assets/, vendor/, config/, ...).
console.log('[postinstall] Copying @ohdsi/atlas3 dist to resources/atlas...');
cpSync(atlasDistDir, resourcesDir, { recursive: true });

// @ohdsi/atlas3 dist omits the single-spa + React UMD files its index.html loads
// to register the plugin runtime; supply them from node_modules.
const vendorDir = join(resourcesDir, 'vendor');
mkdirSync(vendorDir, { recursive: true });
const vendorFiles = [
  ['single-spa-vue/dist/system/single-spa-vue.js', 'single-spa-vue.js'],
  ['single-spa-react/lib/system/single-spa-react.js', 'single-spa-react.js'],
  ['react/umd/react.production.min.js', 'react.production.min.js'],
  ['react/umd/react.development.js', 'react.development.js'],
  ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ['react-dom/umd/react-dom.development.js', 'react-dom.development.js'],
];
for (const [from, to] of vendorFiles) {
  const src = join(rootDir, 'node_modules', from);
  if (existsSync(src)) {
    copyFileSync(src, join(vendorDir, to));
  } else {
    console.warn('[postinstall] WARN: vendor file missing in node_modules:', from);
  }
}
console.log('[postinstall] Supplied single-spa/react vendor files for the Atlas3 plugin runtime');

// Atlas3's accent and chart palettes aren't config-exposed (theme only has
// primaryColor), so re-brand them by string-replacing the copied dist assets.
const COLOR_OVERRIDES = {
  '#eb6622': '#ff5e59', // accent orange -> d2e coral
};
// Palette arrays keyed on the colors (the minified var name changes per build).
const PALETTE_OVERRIDES = {
  // categorical palette (gender slices [0]/[1]): lead navy + coral
  '["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]':
    '["#000080","#ff5e59","#4e79a7","#76b7b2","#59a14f","#edc949","#af7aa1","#9c755f","#bab0ab","#e15759"]',
  // treemap gradient: light -> navy
  '["#7e9bbf","#4e79a7","#1f425a"]':
    '["#c3cce8","#4a5fb0","#000080"]',
};
const assetsDir = join(resourcesDir, 'assets');
if (existsSync(assetsDir)) {
  let recolored = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/\.(js|css)$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    let changed = false;
    for (const [from, to] of Object.entries(COLOR_OVERRIDES)) {
      const re = new RegExp(from.replace('#', '#?'), 'gi');
      if (re.test(txt)) {
        txt = txt.replace(re, (m) => (m.startsWith('#') ? to : to.slice(1)));
        changed = true;
      }
    }
    for (const [from, to] of Object.entries(PALETTE_OVERRIDES)) {
      if (txt.includes(from)) { txt = txt.split(from).join(to); changed = true; }
    }
    if (changed) { writeFileSync(p, txt); recolored++; }
  }
  console.log(`[postinstall] Recolored Atlas3 accent + chart palette (brand navy/coral) in ${recolored} asset file(s)`);

  // d2e landing-page image: Atlas3's landing hero is a hardcoded asset
  // (`const A = new URL("atlas-loading-<hash>.svg", import.meta.url)` rendered as
  // <img class="landing__logo">) — there is NO landing-image theme option (only
  // logoUrl). Repoint just the LandingView reference to the d2e brand image served
  // at /atlas/config/d2e2.svg (../config/ resolves from the assets/ module dir),
  // leaving the shared loading-screen graphic untouched. Version-specific: the
  // hashed filenames change on @ohdsi/atlas3 bumps, so re-verify after upgrades.
  const LANDING_IMAGE = '../config/d2e2.svg';
  let landingPatched = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/^LandingView.*\.js$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    const re = /atlas-loading-[A-Za-z0-9_-]+\.svg/g;
    if (re.test(txt)) {
      txt = txt.replace(re, LANDING_IMAGE);
      writeFileSync(p, txt);
      landingPatched++;
    }
  }
  console.log(`[postinstall] Repointed Atlas3 landing image -> ${LANDING_IMAGE} in ${landingPatched} LandingView file(s)`);
}

// Overlay d2e runtime config: point Atlas3 at WebAPI through d2e.
const configLocalSrc = join(rootDir, 'config-local.json');
if (!existsSync(configLocalSrc)) {
  console.error('[postinstall] ERROR: config-local.json source not found at', configLocalSrc);
  process.exit(1);
}
copyFileSync(configLocalSrc, join(resourcesDir, 'config-local.json'));
console.log('[postinstall] Wrote resources/atlas/config-local.json');

// Overlay nav/theme/header config for the standalone /atlas serve.
const pluginsConfigSrc = join(rootDir, 'plugins.standalone.json');
if (existsSync(pluginsConfigSrc)) {
  mkdirSync(join(resourcesDir, 'config'), { recursive: true });
  copyFileSync(pluginsConfigSrc, join(resourcesDir, 'config', 'plugins.json'));
  console.log('[postinstall] Wrote resources/atlas/config/plugins.json (from plugins.standalone.json)');
}

// Make the d2e logo referenced by the portal config available under /atlas/config.
const logoSrc = join(rootDir, 'd2e2.svg');
if (existsSync(logoSrc)) {
  mkdirSync(join(resourcesDir, 'config'), { recursive: true });
  copyFileSync(logoSrc, join(resourcesDir, 'config', 'd2e2.svg'));
}

// Helper scripts injected into Atlas3's index.html:
//  - login-guard.js: silent-SSO guard; runs first, blocks the WebAPI HS256 fallback.
//  - logo-link.js: routes the header logo to the d2e portal.
//  - token-keeper.js: refreshes the Logto bearerToken before expiry.
const headScripts = ['login-guard.js', 'logo-link.js', 'token-keeper.js'];
let indexHtml = readFileSync(join(resourcesDir, 'index.html'), 'utf8');
let indexChanged = false;
for (const script of headScripts) {
  const src = join(rootDir, 'token-keeper', script);
  if (!existsSync(src)) continue;
  copyFileSync(src, join(resourcesDir, script));
  if (!indexHtml.includes(script)) {
    indexHtml = indexHtml.replace('</head>', `    <script src="./${script}"></script>\n  </head>`);
    indexChanged = true;
  }
}
if (indexChanged) writeFileSync(join(resourcesDir, 'index.html'), indexHtml);
console.log('[postinstall] Injected helper scripts into Atlas3 index.html');

// Portal resources directory (for the /atlas-portal iframe wrapper build).
mkdirSync(join(rootDir, 'resources', 'portal'), { recursive: true });

// Standalone login bridge (served at /atlas-login): copy the static page that
// performs a Logto OIDC login and seeds localStorage.bearerToken for Atlas3.
const loginSrc = join(rootDir, 'login-bridge');
const loginDest = join(rootDir, 'resources', 'login');
if (existsSync(loginSrc)) {
  rmSync(loginDest, { recursive: true, force: true });
  mkdirSync(loginDest, { recursive: true });
  cpSync(loginSrc, loginDest, { recursive: true });
  console.log('[postinstall] Copied login bridge to resources/login');
}

// Serve the @ohdsi/pythia-plugin SystemJS bundle (installed via this plugin's
// dependency + .npmrc, like @ohdsi/atlas3) at /atlas/plugins/pythia-plugin/.
const pythiaSrc = join(rootDir, 'node_modules', '@ohdsi', 'pythia-plugin', 'dist');
const pythiaDest = join(resourcesDir, 'plugins', 'pythia-plugin');
if (existsSync(pythiaSrc)) {
  mkdirSync(pythiaDest, { recursive: true });
  cpSync(pythiaSrc, pythiaDest, { recursive: true });
  // Point the chat endpoint at the agent fn served by trex at /d2e/agent.
  const pythiaEntry = join(pythiaDest, 'index.system.js');
  if (existsSync(pythiaEntry)) {
    let js = readFileSync(pythiaEntry, 'utf8');
    if (js.includes('/WebAPI/trexsql/agent')) {
      js = js.split('/WebAPI/trexsql/agent').join('/d2e/agent');
      writeFileSync(pythiaEntry, js);
      console.log('[postinstall] Repointed Pythia agent endpoint -> /d2e/agent (direct trex fn)');
    }
  }
  console.log('[postinstall] Served Pythia plugin at /atlas/plugins/pythia-plugin');
}

console.log('[postinstall] Atlas3 plugin setup complete!');
