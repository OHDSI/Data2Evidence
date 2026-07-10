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
  // logoUrl). Repoint just the LandingView reference to the d2e portal landing
  // illustration served at /atlas/config/landing-page-illustration.svg (../config/
  // resolves from the assets/ module dir), leaving the shared loading-screen graphic
  // untouched. Version-specific: the hashed filenames change on @ohdsi/atlas3 bumps,
  // so re-verify after upgrades.
  const LANDING_IMAGE = '../config/landing-page-illustration.svg';
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

  // The d2e-compat WebAPI proxy drops POST bodies that serialize to an empty
  // object, so Atlas3's characterization results request (posted with `{}`)
  // reaches WebAPI with no body and fails "Required request body is missing".
  // Coerce an empty/missing body on the results POST to a non-empty, semantically
  // equivalent request (null analysisIds == all). Anchored on the stable endpoint
  // URL rather than the per-build minified helper name.
  const RESULTS_POST_FROM = 'nn(`/cohort-characterization/generation/${e}/result`,t)';
  const RESULTS_POST_TO =
    'nn(`/cohort-characterization/generation/${e}/result`,t&&Object.keys(t).length?t:{analysisIds:null})';
  let resultsPatched = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/\.js$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    if (txt.includes(RESULTS_POST_FROM)) {
      txt = txt.split(RESULTS_POST_FROM).join(RESULTS_POST_TO);
      writeFileSync(p, txt);
      resultsPatched++;
    }
  }
  console.log(`[postinstall] Coerced non-empty characterization results POST body in ${resultsPatched} asset file(s)`);

  // The trexsql cache-status endpoint transiently returns status "error" during a
  // benign attach-retry race even when the cache is built and healthy, and that
  // terminal "error" makes the cohort builder's live patient count give up. Re-check
  // with WebAPI a few times (2.5s backoff) at the single fetch site (Pp) so a
  // transient error self-heals for every consumer (data-source list, count gate,
  // config page). Anchored on the stable `/cache/status` fetch's parse/return;
  // idempotent via the e$rt sentinel; no-op if the minified shape changes on a bump.
  const CACHE_STATUS_SIG_FROM = 'async function Pp(e){const t=`';
  const CACHE_STATUS_SIG_TO = 'async function Pp(e,e$rt=0){const t=`';
  const CACHE_STATUS_RET_FROM =
    'const r=await a.json(),i=dq.safeParse(r);return i.success?i.data:yq(e,r)}';
  const CACHE_STATUS_RET_TO =
    'const r=await a.json(),i=dq.safeParse(r),e$rs=i.success?i.data:yq(e,r);return e$rs&&e$rs.status==="error"&&e$rt<5?(await new Promise(e$rr=>setTimeout(e$rr,2500)),Pp(e,e$rt+1)):e$rs}';
  let cacheRetryPatched = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/\.js$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    if (txt.includes(CACHE_STATUS_SIG_TO)) continue;
    if (!txt.includes(CACHE_STATUS_SIG_FROM) || !txt.includes(CACHE_STATUS_RET_FROM)) continue;
    txt = txt.split(CACHE_STATUS_SIG_FROM).join(CACHE_STATUS_SIG_TO);
    txt = txt.split(CACHE_STATUS_RET_FROM).join(CACHE_STATUS_RET_TO);
    writeFileSync(p, txt);
    cacheRetryPatched++;
  }
  console.log(`[postinstall] Added trexsql cache-status re-check on transient "error" in ${cacheRetryPatched} asset file(s)`);

  // Tag assignment posts a bare tag id (e.g. `2`) as the JSON body, which WebAPI's
  // `/{conceptset|cohortdefinition}/{id}/tag/` endpoints require (they consume a
  // primitive int). The d2e-compat WebAPI proxy sits behind a strict express.json
  // body-parser that rejects a non-object JSON body ("Unexpected token '2', ... is
  // not valid JSON"), so the assign 400s before reaching WebAPI and the tag never
  // persists. Send the assign POST with a `application/json;` content-type (note the
  // trailing empty parameter): media-typer treats it as malformed so body-parser's
  // `application/json` matcher skips it and forwards the body raw, while Spring
  // leniently parses it back to application/json and accepts the bare int. A plain
  // `+json` suffix is not enough — the ConceptSet controller only consumes exactly
  // application/json. Anchored on the stable endpoint literals; idempotent via the
  // patched substring.
  const TAG_POST_PATCHES = [
    [
      'za(`/conceptset/${e}/tag/`,{method:"POST",body:JSON.stringify(t)})',
      'za(`/conceptset/${e}/tag/`,{method:"POST",headers:{"Content-Type":"application/json;"},body:JSON.stringify(t)})',
    ],
    [
      'Ft(`/cohortdefinition/${e}/tag/`,{method:"POST",body:JSON.stringify(t)})',
      'Ft(`/cohortdefinition/${e}/tag/`,{method:"POST",headers:{"Content-Type":"application/json;"},body:JSON.stringify(t)})',
    ],
  ];
  let tagPostPatched = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/\.js$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    let changed = false;
    for (const [from, to] of TAG_POST_PATCHES) {
      if (txt.includes(to)) continue;
      if (!txt.includes(from)) continue;
      txt = txt.split(from).join(to);
      changed = true;
    }
    if (changed) { writeFileSync(p, txt); tagPostPatched++; }
  }
  console.log(`[postinstall] Set body-parser-skipping content-type on tag-assign POST in ${tagPostPatched} asset file(s)`);

  // The ConceptSetEditor save handler updates the concept set first, then calls
  // syncTags(id, oldTags, currentTags). The update mutates the store's concept set,
  // whose watcher resets the tag refs to the (still tag-less) persisted value before
  // syncTags reads them — so the newly added tag diffs to nothing and never gets
  // assigned. Snapshot both tag refs into locals before the update await and diff
  // against those. Anchored on the stable save-handler literal; idempotent via the
  // snapshot-local substring.
  const CS_SYNCTAGS_FROM =
    'function ot(){if(b.value){h.value=!0;try{let i;if(me.value&&c.conceptSet?.id?i=await v.update({...c.conceptSet,name:R.value.name,items:v.currentSet?.items||[]}):i=await v.create({name:R.value.name,items:v.currentSet?.items||[]}),i){const r=i?.id;r!=null&&(await v.syncTags(r,E.value,C.value),E.value=[...C.value]),';
  const CS_SYNCTAGS_TO =
    'function ot(){if(b.value){h.value=!0;try{let i;const E$prev=[...E.value],C$next=[...C.value];if(me.value&&c.conceptSet?.id?i=await v.update({...c.conceptSet,name:R.value.name,items:v.currentSet?.items||[]}):i=await v.create({name:R.value.name,items:v.currentSet?.items||[]}),i){const r=i?.id;r!=null&&(await v.syncTags(r,E$prev,C$next),E.value=[...C$next]),';
  let csSyncPatched = 0;
  for (const file of readdirSync(assetsDir)) {
    if (!/^ConceptSetEditor.*\.js$/.test(file)) continue;
    const p = join(assetsDir, file);
    let txt = readFileSync(p, 'utf8');
    if (txt.includes(CS_SYNCTAGS_TO)) continue;
    if (!txt.includes(CS_SYNCTAGS_FROM)) continue;
    txt = txt.split(CS_SYNCTAGS_FROM).join(CS_SYNCTAGS_TO);
    writeFileSync(p, txt);
    csSyncPatched++;
  }
  console.log(`[postinstall] Snapshotted concept-set tag refs before update so syncTags persists new tags in ${csSyncPatched} asset file(s)`);
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

// Make the d2e portal landing illustration (LandingView hero image) available
// under /atlas/config; see the LandingView repoint above.
const landingImageSrc = join(rootDir, 'landing-page-illustration.svg');
if (existsSync(landingImageSrc)) {
  mkdirSync(join(resourcesDir, 'config'), { recursive: true });
  copyFileSync(landingImageSrc, join(resourcesDir, 'config', 'landing-page-illustration.svg'));
} else {
  // The LandingView repoint above unconditionally points at this file, so a
  // missing source means a broken landing image — surface it loudly.
  console.warn('[postinstall] WARN: landing-page-illustration.svg missing at', landingImageSrc, '- landing image will 404');
}

// Helper scripts injected into Atlas3's index.html:
//  - login-guard.js: silent-SSO guard; runs first, blocks the WebAPI HS256 fallback.
//  - user-link.js: routes the navbar user menu to the d2e portal account page.
//  - token-keeper.js: refreshes the Logto bearerToken before expiry.
const headScripts = ['login-guard.js', 'user-link.js', 'token-keeper.js'];
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

// Table-driven plugin loader: copy each published SystemJS plugin's dist into
// resources/atlas/plugins/<id>/ and apply any endpoint repoints. Mirrors how
// @ohdsi/atlas3 itself is staged; see plugins.standalone.json for registration.
const PLUGINS = [
  {
    pkg: '@ohdsi/pythia-plugin',
    id: 'pythia-plugin',
    // Point the chat endpoint at the agent fn served by trex at /d2e/agent.
    repoints: [['/WebAPI/trexsql/agent', '/d2e/agent']],
  },
  {
    pkg: '@ohdsi/results-viewer',
    id: 'results-viewer',
    repoints: [],
  },
  { pkg: '@ohdsi/strategus-plugin', id: 'strategus-plugin', repoints: [] },
  { pkg: '@ohdsi/notebook-plugin', id: 'notebook-plugin', repoints: [] },
  { pkg: '@ohdsi/network-plugin', id: 'network-plugin', repoints: [] },
  { pkg: '@ohdsi/studies-plugin', id: 'studies-plugin', repoints: [] },
];

for (const { pkg, id, repoints } of PLUGINS) {
  const src = join(rootDir, 'node_modules', ...pkg.split('/'), 'dist');
  const dest = join(resourcesDir, 'plugins', id);
  if (!existsSync(src)) {
    console.warn(`[postinstall] WARN: ${pkg} dist not found at ${src}; skipping ${id}`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  const entry = join(dest, 'index.system.js');
  if (repoints.length && existsSync(entry)) {
    let js = readFileSync(entry, 'utf8');
    let changed = false;
    for (const [from, to] of repoints) {
      if (js.includes(from)) { js = js.split(from).join(to); changed = true; }
    }
    if (changed) {
      writeFileSync(entry, js);
      console.log(`[postinstall] Applied repoints for ${id}: ${repoints.map(([f, t]) => `${f}->${t}`).join(', ')}`);
    }
  }
  console.log(`[postinstall] Served ${id} at /atlas/plugins/${id}`);
}

console.log('[postinstall] Atlas3 plugin setup complete!');
