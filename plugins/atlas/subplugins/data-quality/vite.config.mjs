import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// @d2e/ui (plugins/ui/libs/d2e-ui) is private and unpublished, so it is
// consumed as source, the same way vue-mri-ui-lib does (its vite.config.ts).
// Its Vuetify imports resolve to this plugin's installed copy: the library sits
// outside this package, where node resolution would find plugins/ui's copy, or
// none in the isolated CI install - and two Vuetify copies in one bundle break
// provide/inject. `vue` needs no alias: it is external wherever it is imported
// from, and the host supplies it through the SystemJS import map. Aliasing it
// to a path would defeat the external and bundle a second Vue.
const D2E_UI_SRC = resolve(__dirname, '../../../ui/libs/d2e-ui/src');
const vuetifyDir = dirname(require.resolve('vuetify/package.json'));

// Mirrors trex-notebook/plugins/studies: a SystemJS lib build that Atlas3's
// PluginLoader imports as /atlas/plugins/data-quality/index.system.js.
// `vue` is the only external — the host re-exports it through the SystemJS
// import map in resources/atlas/index.html, so the plugin must not bundle a
// second copy. Everything else (vuetify, @ohdsi/atlas-ui) is bundled.
const OUT_DIR = process.env.DATA_QUALITY_OUT_DIR
  ? join(__dirname, process.env.DATA_QUALITY_OUT_DIR)
  : join(__dirname, 'dist');

export default defineConfig(({ command }) => ({
  resolve: {
    alias: [
      { find: '@d2e/ui/tokens.css', replacement: join(D2E_UI_SRC, 'tokens/tokens.css') },
      { find: '@d2e/ui', replacement: join(D2E_UI_SRC, 'index.ts') },
      {
        find: /^vuetify\/(components|directives)(\/(.+))?$/,
        replacement: join(vuetifyDir, 'lib/$1$2'),
      },
      { find: /^vuetify$/, replacement: join(vuetifyDir, 'lib/framework.js') },
    ],
  },
  plugins: [
    vue(),
    // styles: 'none' for the library build — the Atlas host already ships
    // Vuetify's stylesheet, so it only needs the component code. The dev harness
    // (src/dev.ts) has no host to borrow from, so there the plugin wires
    // Vuetify's prebuilt CSS in as usual.
    vuetify({ autoImport: true, styles: command === 'serve' ? true : 'none' }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: './src/main.ts',
      formats: ['system'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        format: 'system',
        globals: { vue: 'vue' },
      },
    },
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
    // Transform vuetify and @ohdsi/atlas-ui rather than treating them as
    // external, so their `.css` imports go through vite instead of Node's ESM
    // loader — otherwise rendering either throws "Unknown file extension .css".
    server: { deps: { inline: ['vuetify', '@ohdsi/atlas-ui'] } },
  },
}));
