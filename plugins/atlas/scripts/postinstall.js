#!/usr/bin/env node
/**
 * Postinstall script for Atlas plugin
 * Copies Atlas3 dist files and vendor dependencies to resources/atlas
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const resourcesDir = join(rootDir, 'resources', 'atlas');
const nodeModulesDir = join(rootDir, 'node_modules');

console.log('[postinstall] Setting up Atlas plugin resources...');

// Create resources directory
mkdirSync(resourcesDir, { recursive: true });

// 1. Copy Atlas3 dist files
const atlas3Dist = join(nodeModulesDir, '@ohdsi', 'atlas3', 'dist');
if (existsSync(atlas3Dist)) {
  console.log('[postinstall] Copying Atlas3 dist files...');
  cpSync(atlas3Dist, resourcesDir, { recursive: true });
} else {
  console.error('[postinstall] ERROR: Atlas3 dist not found at', atlas3Dist);
  process.exit(1);
}

// 2. Create vendor directory and copy vendor files
const vendorDir = join(resourcesDir, 'vendor');
mkdirSync(vendorDir, { recursive: true });

const vendorFiles = [
  { src: 'systemjs/dist/system.js', dest: 'system.js' },
  { src: 'systemjs/dist/extras/named-register.js', dest: 'named-register.js' },
  { src: 'vue/dist/vue.global.js', dest: 'vue.global.js' },
  { src: 'vue-router/dist/vue-router.global.js', dest: 'vue-router.global.js' },
  { src: 'single-spa-vue/dist/system/single-spa-vue.js', dest: 'single-spa-vue.js' },
  { src: 'react/umd/react.development.js', dest: 'react.development.js' },
  { src: 'react/umd/react.production.min.js', dest: 'react.production.min.js' },
  { src: 'react-dom/umd/react-dom.development.js', dest: 'react-dom.development.js' },
  { src: 'react-dom/umd/react-dom.production.min.js', dest: 'react-dom.production.min.js' },
  { src: 'single-spa-react/lib/umd/single-spa-react.js', dest: 'single-spa-react.js' },
];

console.log('[postinstall] Copying vendor files...');
for (const { src, dest } of vendorFiles) {
  const srcPath = join(nodeModulesDir, src);
  const destPath = join(vendorDir, dest);
  if (existsSync(srcPath)) {
    cpSync(srcPath, destPath);
    console.log(`  Copied ${dest}`);
  } else {
    console.warn(`  WARNING: ${src} not found`);
  }
}

// 3. Copy d4l web components
const d4lDir = join(vendorDir, 'd4l-ui');
mkdirSync(d4lDir, { recursive: true });

const d4lSrcDir = join(nodeModulesDir, '@d4l', 'web-components-library', 'dist', 'd4l-ui');
if (existsSync(d4lSrcDir)) {
  console.log('[postinstall] Copying d4l web components...');
  cpSync(d4lSrcDir, d4lDir, { recursive: true });

  // Also copy loader
  const loaderSrc = join(nodeModulesDir, '@d4l', 'web-components-library', 'dist', 'loader', 'index.js');
  if (existsSync(loaderSrc)) {
    cpSync(loaderSrc, join(d4lDir, 'loader.js'));
  }
} else {
  console.warn('[postinstall] WARNING: d4l web components not found');
}

// 4. Create plugins directory
const pluginsDir = join(resourcesDir, 'plugins');
mkdirSync(pluginsDir, { recursive: true });
mkdirSync(join(pluginsDir, 'cohorts'), { recursive: true });

// 5. Create config directory and copy config files
const configDir = join(resourcesDir, 'config');
mkdirSync(configDir, { recursive: true });

// Copy plugins configuration files (standalone and portal versions)
const pluginsStandaloneSrc = join(rootDir, 'plugins.standalone.json');
const pluginsPortalSrc = join(rootDir, 'plugins.portal.json');

if (existsSync(pluginsStandaloneSrc)) {
  // Default plugins.json is standalone version
  cpSync(pluginsStandaloneSrc, join(configDir, 'plugins.json'));
  cpSync(pluginsStandaloneSrc, join(configDir, 'plugins.standalone.json'));
  console.log('[postinstall] Copied plugins.standalone.json');
}

if (existsSync(pluginsPortalSrc)) {
  cpSync(pluginsPortalSrc, join(configDir, 'plugins.portal.json'));
  console.log('[postinstall] Copied plugins.portal.json');
}

// Copy logo if it exists
const logoSrc = join(rootDir, 'd2e2.svg');
if (existsSync(logoSrc)) {
  cpSync(logoSrc, join(configDir, 'd2e2.svg'));
  console.log('[postinstall] Copied d2e2.svg');
}

// 6. Modify index.html to inject auth-helper.js, import map, and fix paths
const indexPath = join(resourcesDir, 'index.html');
if (existsSync(indexPath)) {
  console.log('[postinstall] Modifying index.html...');
  let html = readFileSync(indexPath, 'utf-8');

  // Inject SystemJS import map before SystemJS loads (must be before system.js script)
  const importMap = `<script type="systemjs-importmap">
{
  "imports": {
    "react": "/atlas/vendor/react.production.min.js",
    "react-dom": "/atlas/vendor/react-dom.production.min.js",
    "react-dom/client": "/atlas/vendor/react-dom.production.min.js",
    "single-spa-react": "/atlas/vendor/single-spa-react.js",
    "vue": "/atlas/vendor/vue.global.js",
    "vue-router": "/atlas/vendor/vue-router.global.js",
    "single-spa-vue": "/atlas/vendor/single-spa-vue.js"
  }
}
</script>`;

  // Inject import map after <head> (before other scripts)
  html = html.replace('<head>', '<head>\n' + importMap);

  // Inject auth-helper.js and d4l components before </head>
  const injection = `<link rel="stylesheet" href="/atlas/vendor/d4l-ui/d4l-ui.css"><script type="module">import "/atlas/vendor/d4l-ui/d4l-ui.esm.js";</script><script src="/atlas/auth-helper.js"></script>`;
  html = html.replace('</head>', injection + '</head>');

  // Replace System.set calls with System.register pattern or remove them since import map handles it
  // Remove the problematic System.set calls for react/react-dom
  html = html.replace(/window\.System\.set\('react',\s*reactModule\);/g,
    "console.log('[SystemJS] React module available via import map');");
  html = html.replace(/window\.System\.set\('react-dom',\s*reactDOMModule\);/g,
    "console.log('[SystemJS] ReactDOM module available via import map');");
  html = html.replace(/window\.System\.set\('react-dom\/client',\s*reactDOMClientModule\);/g,
    "console.log('[SystemJS] ReactDOM/client module available via import map');");
  html = html.replace(/window\.System\.set\('single-spa-react',\s*\{[^}]+\}\);/g,
    "console.log('[SystemJS] single-spa-react module available via import map');");

  // Note: Atlas3 is now built with VITE_BASE_PATH=/atlas, so paths already have /atlas prefix
  // Only fix case-sensitivity if needed: /Atlas/ -> /atlas/
  html = html.replace(/\/Atlas\//g, '/atlas/');

  writeFileSync(indexPath, html);
  console.log('[postinstall] Updated index.html with import map, auth-helper and fixed paths');
}

// 7. Copy auth-helper.js to resources
const authHelperSrc = join(rootDir, 'auth-helper.js');
if (existsSync(authHelperSrc)) {
  cpSync(authHelperSrc, join(resourcesDir, 'auth-helper.js'));
  console.log('[postinstall] Copied auth-helper.js');
}

// 8. Create portal resources directory (for portal plugin wrapper)
const portalDir = join(rootDir, 'resources', 'portal');
mkdirSync(portalDir, { recursive: true });
console.log('[postinstall] Created portal resources directory');

console.log('[postinstall] Atlas plugin setup complete!');
