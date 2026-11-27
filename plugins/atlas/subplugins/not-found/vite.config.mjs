import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Same build as subplugins/data-quality (see the comments in its
// vite.config.mjs): a SystemJS lib that Atlas3's PluginLoader imports as
// /atlas/plugins/not-found/index.system.js, with `vue` external because the
// host supplies it through its SystemJS import map. @d2e/ui is consumed as
// source, and its Vuetify imports resolve to this package's copy so the bundle
// never holds two Vuetify instances.
const D2E_UI_SRC = resolve(__dirname, '../../../ui/libs/d2e-ui/src');
const vuetifyDir = dirname(require.resolve('vuetify/package.json'));

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
    // The Atlas host already ships Vuetify's stylesheet; only the dev harness,
    // which has no host, needs it wired in.
    vuetify({ autoImport: true, styles: command === 'serve' ? true : 'none' }),
  ],
  build: {
    // One style.css for the whole plugin, which main.ts links in on bootstrap.
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
    outDir: join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  test: {
    environment: 'happy-dom',
    // main.spec.ts appends the plugin's <link>; there is no server to fetch it from.
    environmentOptions: { happyDOM: { settings: { disableCSSFileLoading: true } } },
    globals: false,
    include: ['src/**/*.spec.ts'],
    // Let vite transform vuetify so its .css imports don't reach Node's loader.
    server: { deps: { inline: ['vuetify'] } },
  },
}));
