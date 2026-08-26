import { defineConfig } from 'vite'
import path from 'path'

// Atlas3-shell wrapper: a tiny dependency-free SystemJS single-spa parcel served
// at /atlas/plugins/patient-analytics/index.system.js. It only creates an iframe
// hosting the full PA app (built by vite.config.atlas-app.ts into dist-atlas/app)
// and relays the auth/dataset context to it via postMessage.
export default defineConfig({
  publicDir: false,

  resolve: {
    alias: [
      // @d2e/ui is private and unpublished, so the CI atlas build (npm install
      // --workspaces=false) cannot resolve it from the registry. Source-export it
      // from the lib and keep vue/vuetify on the app's installed copy so the
      // library's own bare imports resolve during the isolated install.
      { find: '@d2e/ui/tokens.css', replacement: path.resolve(__dirname, '../../libs/d2e-ui/src/tokens/tokens.css') },
      { find: '@d2e/ui', replacement: path.resolve(__dirname, '../../libs/d2e-ui/src/index.ts') },
      { find: 'vue', replacement: path.resolve(__dirname, 'node_modules/vue') },
      { find: 'vuetify/styles', replacement: path.resolve(__dirname, 'node_modules/vuetify/lib/styles/main.css') },
      {
        find: /^vuetify\/(components|directives)(\/(.+))?$/,
        replacement: path.resolve(__dirname, 'node_modules/vuetify/lib/$1$2'),
      },
      { find: /^vuetify$/, replacement: path.resolve(__dirname, 'node_modules/vuetify/lib/framework.js') },
    ],
  },

  build: {
    outDir: path.resolve(__dirname, 'dist-atlas'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    lib: {
      entry: path.resolve(__dirname, 'src/atlas-iframe-parcel.ts'),
      fileName: () => 'index.system.js',
      formats: ['system'] as const,
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.system.js',
      },
    },
  },
})
