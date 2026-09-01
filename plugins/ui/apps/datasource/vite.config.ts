import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'

// This plugin targets Atlas3 (not d2e's own portal), so unlike sibling apps
// under plugins/ui/apps it does not externalize import-map-overrides —
// Atlas3's SystemJS host only shims vue/vue-router/vuetify/single-spa-vue
// (see Atlas3/public/plugin-runtime.js), and this plugin bundles its own
// copies of those, matching Atlas3/plugins-dev/hello-world-plugin.
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [vue(), vuetify({ autoImport: true }), cssInjectedByJsPlugin()],
    build: {
      outDir: isProduction ? path.resolve(__dirname, '../../resources/datasource') : path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/main.ts'),
        formats: ['system'],
        fileName: 'index',
      },
      rollupOptions: {
        external: [],
        output: {
          format: 'system',
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  }
})
