/**
 * VButton migration screenshot script.
 * Serves local Vuetify/Vue node_modules via a tiny HTTP server,
 * renders the three migrated button contexts, and saves screenshots.
 */
const { chromium } = require('/usr/local/lib/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const NM = path.join(REPO, 'plugins/ui/node_modules');
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// HTML page: renders VButton in three contexts using Vue 3 + Vuetify 3
// ---------------------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VButton Migration Screenshots</title>
  <script type="importmap">
  {
    "imports": {
      "vue": "/nm/vue/dist/vue.esm-browser.js"
    }
  }
  </script>
  <link rel="stylesheet" href="/nm/vuetify/dist/vuetify.min.css" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
    .section {
      background: #fff;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    h2 { font-size: 14px; font-weight: 600; color: #555; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .05em; }
    .btn-group { display: flex; flex-direction: column; gap: 8px; max-width: 280px; }
    .btn-row   { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .label     { font-size: 11px; color: #888; min-width: 120px; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { createApp, defineComponent, h } from 'vue';
    import { createVuetify, components, directives } from '/nm/vuetify/dist/vuetify.esm.js';

    const vuetify = createVuetify({
      components,
      directives,
      defaults: {
        VBtn: { variant: 'flat', color: 'primary' },
      },
      theme: {
        themes: {
          light: {
            colors: { primary: '#000080' },
          },
        },
      },
    });

    // -----------------------------------------------------------------------
    // Bookmarks.vue context — 4 buttons in a column (full-width / block)
    // -----------------------------------------------------------------------
    const BookmarksSection = defineComponent({
      render() {
        const { VBtn, VApp, VMain } = components;
        const mkBtn = (label, disabled = false) =>
          h(VBtn, { block: true, disabled, style: 'margin-bottom:8px' }, () => label);
        return h('div', { class: 'section', id: 'bookmarks' }, [
          h('h2', 'Bookmarks.vue — cohort action buttons (block)'),
          h('div', { class: 'btn-group' }, [
            mkBtn('Create D2E Cohort'),
            mkBtn('Create Atlas Cohort'),
            mkBtn('Import Cohort'),
            mkBtn('Compare Cohorts', true),
          ]),
        ]);
      },
    });

    // -----------------------------------------------------------------------
    // ChartToolbar.vue context — 1 button (disabled state shown too)
    // -----------------------------------------------------------------------
    const ChartToolbarSection = defineComponent({
      render() {
        const { VBtn, VIcon } = components;
        return h('div', { class: 'section', id: 'charttoolbar' }, [
          h('h2', 'ChartToolbar.vue — Open Dashboard button'),
          h('div', { class: 'btn-row' }, [
            h('span', { class: 'label' }, 'Enabled:'),
            h(VBtn, { block: false }, () => 'Open Dashboard'),
          ]),
          h('div', { class: 'btn-row', style: 'margin-top:8px' }, [
            h('span', { class: 'label' }, 'Disabled:'),
            h(VBtn, { block: false, disabled: true }, () => 'Open Dashboard'),
          ]),
        ]);
      },
    });

    // -----------------------------------------------------------------------
    // QueryFilterModern.vue context — Save (disabled) + View more (outlined)
    // -----------------------------------------------------------------------
    const QueryFilterModernSection = defineComponent({
      render() {
        const { VBtn } = components;
        return h('div', { class: 'section', id: 'queryfiltermodern' }, [
          h('h2', 'QueryFilterModern.vue — Save + View more buttons'),
          h('div', { class: 'btn-row' }, [
            h('span', { class: 'label' }, 'Save (ready):'),
            h(VBtn, {}, () => 'Save'),
          ]),
          h('div', { class: 'btn-row', style: 'margin-top:8px' }, [
            h('span', { class: 'label' }, 'Save (loading):'),
            h(VBtn, { disabled: true }, () => 'Loading...'),
          ]),
          h('div', { class: 'btn-row', style: 'margin-top:8px' }, [
            h('span', { class: 'label' }, 'View more:'),
            h(VBtn, { variant: 'outlined', color: 'primary', class: 'cohort-actions-btn' }, () => 'View more'),
          ]),
        ]);
      },
    });

    // -----------------------------------------------------------------------
    // Mount all three sections
    // -----------------------------------------------------------------------
    const Root = defineComponent({
      render() {
        const { VApp, VMain } = components;
        return h(VApp, () =>
          h(VMain, { style: 'padding:24px; background:#f5f5f5' }, () => [
            h(BookmarksSection),
            h(ChartToolbarSection),
            h(QueryFilterModernSection),
          ])
        );
      },
    });

    const app = createApp(Root);
    app.use(vuetify);
    app.mount('#app');

    // Signal ready
    document.title = 'READY';
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Tiny static HTTP server
// ---------------------------------------------------------------------------
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.map':  'application/json',
    '.sass': 'text/plain',
    '.scss': 'text/plain',
  }[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found: ' + filePath); return;
  }
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
  } else if (url.startsWith('/nm/')) {
    serveFile(res, path.join(NM, url.slice(4)));
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  await new Promise(r => server.listen(19876, r));
  console.log('Server listening on http://localhost:19876');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();

  // Capture console errors
  page.on('console', m => { if (m.type() === 'error') console.error('[browser]', m.text()); });
  page.on('pageerror', e => console.error('[page error]', e.message));

  await page.goto('http://localhost:19876/', { waitUntil: 'networkidle' });

  // Wait for Vue to mount (title changes to READY)
  await page.waitForFunction(() => document.title === 'READY', { timeout: 10000 });
  await page.waitForTimeout(500); // let Vuetify finish painting

  // --- Full page ---
  const full = path.join(OUT, 'vbutton-all-contexts.png');
  await page.screenshot({ path: full, fullPage: true });
  console.log('Saved:', full);

  // --- Bookmarks section ---
  const bm = await page.$('#bookmarks');
  const bmPath = path.join(OUT, 'bookmarks-vbutton.png');
  await bm.screenshot({ path: bmPath });
  console.log('Saved:', bmPath);

  // --- ChartToolbar section ---
  const ct = await page.$('#charttoolbar');
  const ctPath = path.join(OUT, 'charttoolbar-vbutton.png');
  await ct.screenshot({ path: ctPath });
  console.log('Saved:', ctPath);

  // --- QueryFilterModern section ---
  const qf = await page.$('#queryfiltermodern');
  const qfPath = path.join(OUT, 'queryfiltermodern-vbutton.png');
  await qf.screenshot({ path: qfPath });
  console.log('Saved:', qfPath);

  await browser.close();
  server.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
